<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\CashManagement\Models\CashRegisterMovement;
use App\Modules\CashManagement\Models\CashRegisterSession;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class RecordCashMovementAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  numeric-string  $amount
     */
    public function execute(
        CashRegisterSession $session,
        string $type,
        string $amount,
        string $reason,
        int $actorId,
        ?string $referenceType = null,
        ?int $referenceId = null,
    ): CashRegisterMovement {
        return DB::transaction(function () use ($session, $type, $amount, $reason, $actorId, $referenceType, $referenceId): CashRegisterMovement {
            /** @var CashRegisterSession $locked */
            $locked = CashRegisterSession::query()->where('id', $session->id)->lockForUpdate()->firstOrFail();

            // BR-012: Closed sessions are immutable for regular cash movements.
            if ($locked->status !== 'open') {
                throw ValidationException::withMessages([
                    'session' => ['Cannot record cash movement on a closed register session.'],
                ]);
            }

            if (! in_array($type, ['cash_in', 'cash_out', 'cash_expense'], true)) {
                throw ValidationException::withMessages([
                    'type' => ['Invalid cash movement type.'],
                ]);
            }

            /** @var numeric-string $normalizedAmount */
            $normalizedAmount = bcadd($amount, '0', 2);
            if (bccomp($normalizedAmount, '0.00', 2) <= 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Amount must be greater than zero.'],
                ]);
            }

            $movement = CashRegisterMovement::query()->create([
                'organization_id' => $locked->organization_id,
                'store_id' => $locked->store_id,
                'session_id' => $locked->id,
                'type' => $type,
                'amount' => $normalizedAmount,
                'reason' => $reason,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'created_by' => $actorId,
                'created_at' => now(),
            ]);

            $this->auditLogger->log(
                module: 'CashManagement',
                action: "cash_register.{$type}",
                entityType: CashRegisterMovement::class,
                entityId: $movement->id,
                newValues: [
                    'session_id' => $locked->id,
                    'type' => $type,
                    'amount' => $normalizedAmount,
                    'reason' => $reason,
                ],
                organizationId: $locked->organization_id,
                storeId: $locked->store_id,
                userId: $actorId,
            );

            return $movement->load('creator');
        });
    }
}
