<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\CashManagement\Models\CashRegisterMovement;
use App\Modules\CashManagement\Models\CashRegisterSession;
use App\Modules\CashManagement\Services\CashReconciliationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class AdjustClosedSessionAction
{
    public function __construct(
        private CashReconciliationService $reconciliation,
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * BR-012: Post-close correction via append-only adjustment entry + special permission + audit log.
     *
     * @param  numeric-string  $adjustmentAmount
     */
    public function execute(
        CashRegisterSession $session,
        string $adjustmentAmount,
        string $reason,
        int $actorId,
    ): CashRegisterSession {
        return DB::transaction(function () use ($session, $adjustmentAmount, $reason, $actorId): CashRegisterSession {
            /** @var CashRegisterSession $locked */
            $locked = CashRegisterSession::query()->where('id', $session->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'closed') {
                throw ValidationException::withMessages([
                    'session' => ['Only closed cash register sessions can receive post-close adjustments.'],
                ]);
            }

            /** @var numeric-string $normalized */
            $normalized = bcadd($adjustmentAmount, '0', 2);
            if (bccomp($normalized, '0.00', 2) === 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Adjustment amount cannot be zero.'],
                ]);
            }

            $oldExpected = $locked->expected_cash;
            $oldDifference = $locked->cash_difference;

            CashRegisterMovement::query()->create([
                'organization_id' => $locked->organization_id,
                'store_id' => $locked->store_id,
                'session_id' => $locked->id,
                'type' => 'cash_adjustment',
                'amount' => $normalized,
                'reason' => $reason,
                'created_by' => $actorId,
                'created_at' => now(),
            ]);

            $summary = $this->reconciliation->summarize($locked);

            $locked->update([
                'expected_cash' => $summary['expected_cash'],
                'cash_difference' => $summary['cash_difference'],
            ]);

            $this->auditLogger->log(
                module: 'CashManagement',
                action: 'cash_register.closed_session_adjusted',
                entityType: CashRegisterSession::class,
                entityId: $locked->id,
                oldValues: [
                    'expected_cash' => $oldExpected,
                    'cash_difference' => $oldDifference,
                ],
                newValues: [
                    'adjustment_amount' => $normalized,
                    'expected_cash' => $summary['expected_cash'],
                    'cash_difference' => $summary['cash_difference'],
                    'reason' => $reason,
                ],
                organizationId: $locked->organization_id,
                storeId: $locked->store_id,
                userId: $actorId,
            );

            return $locked->refresh()->load(['register', 'user', 'movements.creator']);
        });
    }
}
