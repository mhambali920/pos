<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Inventory\Models\StockOpname;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class FinalizeStockOpnameAction
{
    public function __construct(
        private InventoryLedgerContract $ledger,
        private AuditLoggerContract $auditLogger,
    ) {}

    public function execute(StockOpname $opname, int $actorId): StockOpname
    {
        return DB::transaction(function () use ($opname, $actorId): StockOpname {
            /** @var StockOpname $locked */
            $locked = StockOpname::query()
                ->where('id', $opname->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== 'draft') {
                throw ValidationException::withMessages([
                    'status' => ['Only draft stock opnames can be finalized.'],
                ]);
            }

            $items = $locked->items()->orderBy('product_variant_id')->get();

            foreach ($items as $item) {
                $stock = InventoryStock::query()
                    ->where('warehouse_id', $locked->warehouse_id)
                    ->where('product_variant_id', $item->product_variant_id)
                    ->when(
                        $item->batch_id !== null,
                        fn ($q) => $q->where('batch_id', $item->batch_id),
                        fn ($q) => $q->whereNull('batch_id'),
                    )
                    ->first();

                /** @var numeric-string $systemQty */
                $systemQty = $stock instanceof InventoryStock ? bcadd($stock->qty_on_hand, '0', 4) : '0.0000';
                /** @var numeric-string $countedQty */
                $countedQty = bcadd($item->counted_qty, '0', 4);
                $variance = bcsub($countedQty, $systemQty, 4);

                $item->update([
                    'system_qty' => $systemQty,
                    'variance_qty' => $variance,
                ]);

                if (bccomp($variance, '0.0000', 4) !== 0) {
                    $this->ledger->mutate(new StockMutationData(
                        organizationId: $locked->organization_id,
                        warehouseId: $locked->warehouse_id,
                        productVariantId: $item->product_variant_id,
                        movementType: StockMovementType::Opname,
                        qtyChange: $variance,
                        referenceType: StockOpname::class,
                        referenceId: $locked->id,
                        batchId: $item->batch_id,
                        notes: "Stock opname {$locked->opname_number}",
                        actorId: $actorId,
                    ));
                }
            }

            $locked->update([
                'status' => 'finalized',
                'finalized_by' => $actorId,
                'finalized_at' => now(),
            ]);

            $this->auditLogger->log(
                module: 'Inventory',
                action: 'stock_opname.finalized',
                entityType: StockOpname::class,
                entityId: $locked->id,
                newValues: ['opname_number' => $locked->opname_number, 'item_count' => $items->count()],
                organizationId: $locked->organization_id,
                userId: $actorId,
            );

            return $locked->refresh()->load(['warehouse', 'items.variant']);
        });
    }
}
