<?php

declare(strict_types=1);

namespace App\Modules\Expense\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Expense\Models\Expense;
use App\Modules\Expense\Models\ExpenseCategory;
use App\Modules\Store\Models\Store;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final readonly class CreateExpenseAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array{
     *     category_id: int,
     *     expense_date: string,
     *     amount: numeric-string,
     *     description: string,
     *     payment_method_id?: int|null,
     *     cash_register_session_id?: int|null
     * }  $data
     */
    public function execute(Store $store, array $data, int $actorId, ?UploadedFile $attachment = null): Expense
    {
        return DB::transaction(function () use ($store, $data, $actorId, $attachment): Expense {
            $categoryExists = ExpenseCategory::query()
                ->where('organization_id', $store->organization_id)
                ->where('id', $data['category_id'])
                ->where('is_active', true)
                ->exists();

            if (! $categoryExists) {
                throw ValidationException::withMessages([
                    'category_id' => ['Selected expense category is invalid or inactive.'],
                ]);
            }

            $attachmentPath = null;
            if ($attachment instanceof UploadedFile) {
                $stored = $attachment->store(
                    "expenses/{$store->organization_id}/{$store->id}",
                    'local',
                );
                $attachmentPath = is_string($stored) ? $stored : null;
            }

            /** @var numeric-string $normalizedAmount */
            $normalizedAmount = bcadd((string) $data['amount'], '0', 2);

            $expense = Expense::query()->create([
                'organization_id' => $store->organization_id,
                'store_id' => $store->id,
                'category_id' => $data['category_id'],
                'cash_register_session_id' => $data['cash_register_session_id'] ?? null,
                'payment_method_id' => $data['payment_method_id'] ?? null,
                'expense_number' => 'EXP-'.$store->code.'-'.now()->format('YmdHis').'-'.strtoupper(Str::random(4)),
                'expense_date' => $data['expense_date'],
                'amount' => $normalizedAmount,
                'description' => $data['description'],
                'attachment_path' => $attachmentPath,
                'status' => 'pending_approval',
                'created_by' => $actorId,
            ]);

            $this->auditLogger->log(
                module: 'Expense',
                action: 'expense.created',
                entityType: Expense::class,
                entityId: $expense->id,
                newValues: [
                    'expense_number' => $expense->expense_number,
                    'amount' => $normalizedAmount,
                    'category_id' => $expense->category_id,
                ],
                organizationId: $store->organization_id,
                storeId: $store->id,
                userId: $actorId,
            );

            return $expense->load(['category', 'paymentMethod', 'creator', 'approver']);
        });
    }
}
