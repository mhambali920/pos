<?php

declare(strict_types=1);

namespace App\Modules\Expense\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\CashManagement\Actions\RecordCashMovementAction;
use App\Modules\CashManagement\Models\CashRegisterSession;
use App\Modules\Expense\Models\Expense;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class ApproveExpenseAction
{
    public function __construct(
        private RecordCashMovementAction $cashMovementAction,
        private AuditLoggerContract $auditLogger,
    ) {}

    public function execute(Expense $expense, int $actorId): Expense
    {
        return DB::transaction(function () use ($expense, $actorId): Expense {
            /** @var Expense $locked */
            $locked = Expense::query()->where('id', $expense->id)->lockForUpdate()->firstOrFail();

            if (! in_array($locked->status, ['draft', 'pending_approval'], true)) {
                throw ValidationException::withMessages([
                    'status' => ["Expense in status '{$locked->status}' cannot be approved."],
                ]);
            }

            $locked->update([
                'status' => 'approved',
                'approved_by' => $actorId,
                'approved_at' => now(),
                'rejection_reason' => null,
            ]);

            if ($locked->cash_register_session_id !== null) {
                $session = CashRegisterSession::query()
                    ->where('id', $locked->cash_register_session_id)
                    ->where('status', 'open')
                    ->first();

                if ($session instanceof CashRegisterSession) {
                    $this->cashMovementAction->execute(
                        session: $session,
                        type: 'cash_expense',
                        amount: $locked->amount,
                        reason: "Expense {$locked->expense_number}: {$locked->description}",
                        actorId: $actorId,
                        referenceType: Expense::class,
                        referenceId: $locked->id,
                    );
                }
            }

            $this->auditLogger->log(
                module: 'Expense',
                action: 'expense.approved',
                entityType: Expense::class,
                entityId: $locked->id,
                newValues: [
                    'expense_number' => $locked->expense_number,
                    'amount' => $locked->amount,
                    'status' => 'approved',
                ],
                organizationId: $locked->organization_id,
                storeId: $locked->store_id,
                userId: $actorId,
            );

            return $locked->refresh()->load(['category', 'paymentMethod', 'creator', 'approver']);
        });
    }
}
