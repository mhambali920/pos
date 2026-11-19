<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Purchasing\Models\GoodsReceipt;
use App\Modules\Purchasing\Models\PurchaseOrder;
use App\Modules\Purchasing\Models\PurchaseOrderItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class ConfirmGoodsReceiptAction
{
    public function __construct(
        private InventoryLedgerContract $ledger,
        private AuditLoggerContract $auditLogger,
    ) {}

    public function execute(GoodsReceipt $receipt, int $actorId): GoodsReceipt
    {
        return DB::transaction(function () use ($receipt, $actorId): GoodsReceipt {
            /** @var GoodsReceipt $lockedReceipt */
            $lockedReceipt = GoodsReceipt::query()->where('id', $receipt->id)->lockForUpdate()->firstOrFail();

            if ($lockedReceipt->status !== 'draft') {
                throw ValidationException::withMessages([
                    'status' => ['Only draft goods receipts can be confirmed.'],
                ]);
            }

            /** @var PurchaseOrder $po */
            $po = PurchaseOrder::query()->where('id', $lockedReceipt->purchase_order_id)->lockForUpdate()->firstOrFail();

            if (! in_array($po->status, ['approved', 'partially_received'], true)) {
                throw ValidationException::withMessages([
                    'purchase_order_id' => ["Purchase order must be approved before receiving goods (current: {$po->status})."],
                ]);
            }

            $items = $lockedReceipt->items()->orderBy('product_variant_id')->get();

            foreach ($items as $grItem) {
                /** @var PurchaseOrderItem $poItem */
                $poItem = PurchaseOrderItem::query()
                    ->where('id', $grItem->purchase_order_item_id)
                    ->where('purchase_order_id', $po->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $newReceived = bcadd($poItem->qty_received, $grItem->qty_received, 4);
                if (bccomp($newReceived, $poItem->qty_ordered, 4) > 0) {
                    throw ValidationException::withMessages([
                        'items' => ["Received quantity exceeds ordered quantity for SKU {$poItem->sku_snapshot}."],
                    ]);
                }

                if (bccomp($grItem->qty_damaged, $grItem->qty_received, 4) > 0) {
                    throw ValidationException::withMessages([
                        'items' => ["Damaged quantity cannot exceed received quantity for SKU {$poItem->sku_snapshot}."],
                    ]);
                }

                $goodQty = bcsub($grItem->qty_received, $grItem->qty_damaged, 4);

                if (bccomp($goodQty, '0.0000', 4) > 0) {
                    $this->ledger->mutate(new StockMutationData(
                        organizationId: $lockedReceipt->organization_id,
                        warehouseId: $lockedReceipt->warehouse_id,
                        productVariantId: $grItem->product_variant_id,
                        movementType: StockMovementType::PurchaseIn,
                        qtyChange: $goodQty,
                        referenceType: GoodsReceipt::class,
                        referenceId: $lockedReceipt->id,
                        batchId: $grItem->batch_id,
                        unitCost: $grItem->unit_cost,
                        notes: "GRN {$lockedReceipt->grn_number} for PO {$po->po_number}",
                        actorId: $actorId,
                    ));
                }

                $poItem->update(['qty_received' => $newReceived]);
            }

            $allReceived = $po->items()->get()->every(
                fn (PurchaseOrderItem $line): bool => bccomp($line->qty_received, $line->qty_ordered, 4) >= 0,
            );

            $po->update([
                'status' => $allReceived ? 'received' : 'partially_received',
            ]);

            $lockedReceipt->update([
                'status' => 'confirmed',
                'confirmed_by' => $actorId,
                'confirmed_at' => now(),
            ]);

            $this->auditLogger->log(
                module: 'Purchasing',
                action: 'goods_receipt.confirmed',
                entityType: GoodsReceipt::class,
                entityId: $lockedReceipt->id,
                newValues: ['grn_number' => $lockedReceipt->grn_number, 'po_status' => $po->status],
                organizationId: $lockedReceipt->organization_id,
                userId: $actorId,
            );

            return $lockedReceipt->refresh()->load(['purchaseOrder', 'warehouse', 'items']);
        });
    }
}
