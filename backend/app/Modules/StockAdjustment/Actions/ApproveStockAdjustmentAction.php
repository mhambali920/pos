<?php

declare(strict_types=1);

namespace App\Modules\StockAdjustment\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\StockAdjustment\Models\StockAdjustment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class ApproveStockAdjustmentAction
{
    public function __construct(
        private InventoryLedgerContract $ledger,
        private AuditLoggerContract $auditLogger,
    ) {}

    public function execute(StockAdjustment $adjustment, int $actorId): StockAdjustment
    {
        return DB::transaction(function () use ($adjustment, $actorId): StockAdjustment {
            /** @var StockAdjustment $locked */
            $locked = StockAdjustment::query()
                ->where('id', $adjustment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== 'draft') {
                throw ValidationException::withMessages([
                    'status' => ['Only draft stock adjustments can be approved.'],
                ]);
            }

            $items = $locked->items()->orderBy('product_variant_id')->get();

            foreach ($items as $item) {
                $isIn = $item->direction === 'in';
                /** @var numeric-string $absQty */
                $absQty = bcadd($item->quantity, '0', 4);
                $qtyChange = $isIn ? $absQty : bcmul($absQty, '-1', 4);

                /** @var numeric-string|null $unitCost */
                $unitCost = $item->unit_cost !== null ? bcadd($item->unit_cost, '0', 2) : null;

                $this->ledger->mutate(new StockMutationData(
                    organizationId: $locked->organization_id,
                    warehouseId: $locked->warehouse_id,
                    productVariantId: $item->product_variant_id,
                    movementType: $isIn ? StockMovementType::AdjustmentIn : StockMovementType::AdjustmentOut,
                    qtyChange: $qtyChange,
                    referenceType: StockAdjustment::class,
                    referenceId: $locked->id,
                    batchId: $item->batch_id,
                    unitCost: $unitCost,
                    notes: $item->notes ?? $locked->reason,
                    actorId: $actorId,
                ));
            }

            $locked->update([
                'status' => 'approved',
                'approved_by' => $actorId,
                'approved_at' => now(),
            ]);

            $this->auditLogger->log(
                module: 'StockAdjustment',
                action: 'stock_adjustment.approved',
                entityType: StockAdjustment::class,
                entityId: $locked->id,
                newValues: [
                    'adjustment_number' => $locked->adjustment_number,
                    'reason' => $locked->reason,
                    'item_count' => $items->count(),
                ],
                organizationId: $locked->organization_id,
                userId: $actorId,
            );

            return $locked->refresh()->load(['warehouse', 'items.variant']);
        });
    }
}
