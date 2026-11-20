<?php

declare(strict_types=1);

namespace App\Modules\Expense\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Expense\Models\Expense;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class RejectExpenseAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    public function execute(Expense $expense, string $reason, int $actorId): Expense
    {
        return DB::transaction(function () use ($expense, $reason, $actorId): Expense {
            /** @var Expense $locked */
            $locked = Expense::query()->where('id', $expense->id)->lockForUpdate()->firstOrFail();

            if (! in_array($locked->status, ['draft', 'pending_approval'], true)) {
                throw ValidationException::withMessages([
                    'status' => ["Expense in status '{$locked->status}' cannot be rejected."],
                ]);
            }

            $locked->update([
                'status' => 'rejected',
                'approved_by' => $actorId,
                'approved_at' => now(),
                'rejection_reason' => $reason,
            ]);

            $this->auditLogger->log(
                module: 'Expense',
                action: 'expense.rejected',
                entityType: Expense::class,
                entityId: $locked->id,
                newValues: [
                    'expense_number' => $locked->expense_number,
                    'status' => 'rejected',
                    'rejection_reason' => $reason,
                ],
                organizationId: $locked->organization_id,
                storeId: $locked->store_id,
                userId: $actorId,
            );

            return $locked->refresh()->load(['category', 'paymentMethod', 'creator', 'approver']);
        });
    }
}
