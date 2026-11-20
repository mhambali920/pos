<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\CashManagement\Domain\Exceptions\PendingTransactionsExistException;
use App\Modules\CashManagement\Models\CashRegisterSession;
use App\Modules\CashManagement\Services\CashReconciliationService;
use App\Modules\Sales\Models\Sale;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class CloseCashRegisterAction
{
    public function __construct(
        private CashReconciliationService $reconciliation,
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  numeric-string  $actualCash
     */
    public function execute(
        CashRegisterSession $session,
        string $actualCash,
        ?string $closingNotes,
        int $actorId,
    ): CashRegisterSession {
        return DB::transaction(function () use ($session, $actualCash, $closingNotes, $actorId): CashRegisterSession {
            /** @var CashRegisterSession $locked */
            $locked = CashRegisterSession::query()->where('id', $session->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'open') {
                throw ValidationException::withMessages([
                    'session' => ['This cash register session is already closed.'],
                ]);
            }

            // CS-08 & BR-011: Cannot close register if any pending_payment sale exists for this session/cashier.
            $pendingCount = Sale::query()
                ->where('store_id', $locked->store_id)
                ->where('status', 'pending_payment')
                ->where(function ($query) use ($locked): void {
                    $query->where('cash_register_session_id', $locked->id)
                        ->orWhere(function ($q) use ($locked): void {
                            $q->whereNull('cash_register_session_id')
                                ->where('cashier_id', $locked->user_id);
                        });
                })
                ->count();

            if ($pendingCount > 0) {
                throw new PendingTransactionsExistException(
                    message: 'Cannot close cash register while pending payment transactions exist.',
                    pendingCount: $pendingCount,
                );
            }

            $summary = $this->reconciliation->summarize($locked);
            $expectedCash = $summary['expected_cash'];
            /** @var numeric-string $normalizedActual */
            $normalizedActual = bcadd($actualCash, '0', 2);
            $difference = bcsub($normalizedActual, $expectedCash, 2);

            $locked->update([
                'status' => 'closed',
                'closed_at' => now(),
                'expected_cash' => $expectedCash,
                'actual_cash' => $normalizedActual,
                'cash_difference' => $difference,
                'closing_notes' => $closingNotes,
            ]);

            $cmp = bccomp($difference, '0.00', 2);
            $statusLabel = match (true) {
                $cmp === 0 => 'balanced',
                $cmp > 0 => 'overage',
                default => 'shortage',
            };

            $this->auditLogger->log(
                module: 'CashManagement',
                action: 'cash_register.closed',
                entityType: CashRegisterSession::class,
                entityId: $locked->id,
                newValues: [
                    'expected_cash' => $expectedCash,
                    'actual_cash' => $normalizedActual,
                    'cash_difference' => $difference,
                    'reconciliation_status' => $statusLabel,
                    'closing_notes' => $closingNotes,
                ],
                organizationId: $locked->organization_id,
                storeId: $locked->store_id,
                userId: $actorId,
            );

            return $locked->refresh()->load(['register', 'user', 'movements.creator']);
        });
    }
}
