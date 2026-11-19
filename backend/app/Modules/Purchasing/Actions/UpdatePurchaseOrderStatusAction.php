<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Purchasing\Models\PurchaseOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class UpdatePurchaseOrderStatusAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    public function execute(PurchaseOrder $po, string $action, int $actorId): PurchaseOrder
    {
        return DB::transaction(function () use ($po, $action, $actorId): PurchaseOrder {
            /** @var PurchaseOrder $locked */
            $locked = PurchaseOrder::query()->where('id', $po->id)->lockForUpdate()->firstOrFail();

            $allowedFrom = match ($action) {
                'submit' => ['draft'],
                'approve', 'reject' => ['draft', 'submitted'],
                'cancel' => ['draft', 'submitted', 'approved'],
                default => [],
            };

            if (! in_array($locked->status, $allowedFrom, true)) {
                throw ValidationException::withMessages([
                    'status' => ["Cannot {$action} purchase order in status '{$locked->status}'."],
                ]);
            }

            $oldStatus = $locked->status;
            $nextStatus = match ($action) {
                'submit' => 'submitted',
                'approve' => 'approved',
                'reject' => 'rejected',
                'cancel' => 'cancelled',
                default => $locked->status,
            };

            $updates = ['status' => $nextStatus];
            if ($action === 'approve') {
                $updates['approved_by'] = $actorId;
                $updates['approved_at'] = now();
            }

            $locked->update($updates);

            $this->auditLogger->log(
                module: 'Purchasing',
                action: "purchase_order.{$action}",
                entityType: PurchaseOrder::class,
                entityId: $locked->id,
                oldValues: ['status' => $oldStatus],
                newValues: ['status' => $nextStatus],
                organizationId: $locked->organization_id,
                userId: $actorId,
            );

            return $locked->refresh()->load(['supplier', 'warehouse', 'items']);
        });
    }
}
