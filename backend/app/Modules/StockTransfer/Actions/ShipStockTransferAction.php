<?php

declare(strict_types=1);

namespace App\Modules\StockTransfer\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\StockTransfer\Models\StockTransfer;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class ShipStockTransferAction
{
    public function __construct(
        private InventoryLedgerContract $ledger,
        private AuditLoggerContract $auditLogger,
    ) {}

    public function execute(StockTransfer $transfer, int $actorId): StockTransfer
    {
        return DB::transaction(function () use ($transfer, $actorId): StockTransfer {
            /** @var StockTransfer $locked */
            $locked = StockTransfer::query()
                ->where('id', $transfer->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== 'draft') {
                throw ValidationException::withMessages([
                    'status' => ['Only draft stock transfers can be shipped.'],
                ]);
            }

            $items = $locked->items()->orderBy('product_variant_id')->get();

            foreach ($items as $item) {
                /** @var numeric-string $absQty */
                $absQty = bcadd($item->quantity, '0', 4);
                $negativeQty = bcmul($absQty, '-1', 4);

                $movement = $this->ledger->mutate(new StockMutationData(
                    organizationId: $locked->organization_id,
                    warehouseId: $locked->from_warehouse_id,
                    productVariantId: $item->product_variant_id,
                    movementType: StockMovementType::TransferOut,
                    qtyChange: $negativeQty,
                    referenceType: StockTransfer::class,
                    referenceId: $locked->id,
                    batchId: $item->batch_id,
                    notes: "Transfer out {$locked->transfer_number}",
                    actorId: $actorId,
                ));

                $item->update(['unit_cost' => $movement->unit_cost]);
            }

            $locked->update([
                'status' => 'in_transit',
                'shipped_by' => $actorId,
                'shipped_at' => now(),
            ]);

            $this->auditLogger->log(
                module: 'StockTransfer',
                action: 'stock_transfer.shipped',
                entityType: StockTransfer::class,
                entityId: $locked->id,
                newValues: [
                    'transfer_number' => $locked->transfer_number,
                    'from_warehouse_id' => $locked->from_warehouse_id,
                    'to_warehouse_id' => $locked->to_warehouse_id,
                ],
                organizationId: $locked->organization_id,
                userId: $actorId,
            );

            return $locked->refresh()->load(['fromWarehouse', 'toWarehouse', 'items.variant']);
        });
    }
}
