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

final readonly class CancelStockTransferAction
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

            if (! in_array($locked->status, ['draft', 'in_transit'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Only draft or in-transit transfers can be cancelled.'],
                ]);
            }

            $wasInTransit = $locked->status === 'in_transit';

            if ($wasInTransit) {
                $items = $locked->items()->orderBy('product_variant_id')->get();
                foreach ($items as $item) {
                    /** @var numeric-string $qty */
                    $qty = bcadd($item->quantity, '0', 4);
                    /** @var numeric-string $unitCost */
                    $unitCost = bcadd($item->unit_cost, '0', 2);

                    $this->ledger->mutate(new StockMutationData(
                        organizationId: $locked->organization_id,
                        warehouseId: $locked->from_warehouse_id,
                        productVariantId: $item->product_variant_id,
                        movementType: StockMovementType::TransferIn,
                        qtyChange: $qty,
                        referenceType: StockTransfer::class,
                        referenceId: $locked->id,
                        batchId: $item->batch_id,
                        unitCost: $unitCost,
                        notes: "Reversal of cancelled transfer {$locked->transfer_number}",
                        actorId: $actorId,
                    ));
                }
            }

            $locked->update(['status' => 'cancelled']);

            $this->auditLogger->log(
                module: 'StockTransfer',
                action: 'stock_transfer.cancelled',
                entityType: StockTransfer::class,
                entityId: $locked->id,
                newValues: ['transfer_number' => $locked->transfer_number, 'reversed_from_in_transit' => $wasInTransit],
                organizationId: $locked->organization_id,
                userId: $actorId,
            );

            return $locked->refresh()->load(['fromWarehouse', 'toWarehouse', 'items.variant']);
        });
    }
}
