<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Exceptions\InsufficientStockException;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Product\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

final class InventoryLedgerService implements InventoryLedgerContract
{
    public function mutate(StockMutationData $data): StockMovement
    {
        return DB::transaction(function () use ($data): StockMovement {
            $stock = $this->lockOrCreateStock(
                organizationId: $data->organizationId,
                warehouseId: $data->warehouseId,
                productVariantId: $data->productVariantId,
                batchId: $data->batchId,
            );

            /** @var numeric-string $qtyBefore */
            $qtyBefore = bcadd($stock->qty_on_hand, '0', 4);
            /** @var numeric-string $qtyReserved */
            $qtyReserved = bcadd($stock->qty_reserved, '0', 4);
            /** @var numeric-string $qtyChange */
            $qtyChange = bcadd($data->qtyChange, '0', 4);

            if (bccomp($qtyChange, '0.0000', 4) < 0) {
                $available = bcsub($qtyBefore, $qtyReserved, 4);
                $requested = bcmul($qtyChange, '-1', 4);

                if (! $data->allowNegativeStock && bccomp($available, $requested, 4) < 0) {
                    throw new InsufficientStockException(
                        message: "Insufficient stock for variant #{$data->productVariantId}. Available: {$available}, requested: {$requested}.",
                        productVariantId: $data->productVariantId,
                        availableQty: $available,
                        requestedQty: $requested,
                    );
                }
            }

            $qtyAfter = bcadd($qtyBefore, $qtyChange, 4);

            /** @var numeric-string $currentCost */
            $currentCost = bcadd($stock->unit_cost, '0', 2);
            $effectiveCost = $currentCost;

            if (
                bccomp($qtyChange, '0.0000', 4) > 0
                && $data->unitCost !== null
                && bccomp($data->unitCost, '0.00', 2) > 0
            ) {
                /** @var numeric-string $incomingCost */
                $incomingCost = bcadd($data->unitCost, '0', 2);

                if (bccomp($qtyBefore, '0.0000', 4) <= 0) {
                    $effectiveCost = $incomingCost;
                } else {
                    $existingValue = bcmul($qtyBefore, $currentCost, 6);
                    $incomingValue = bcmul($qtyChange, $incomingCost, 6);
                    $totalValue = bcadd($existingValue, $incomingValue, 6);
                    $rawAverage = bcdiv($totalValue, $qtyAfter, 6);
                    $effectiveCost = bcadd($rawAverage, '0.005', 2);
                }

                ProductVariant::query()
                    ->where('id', $data->productVariantId)
                    ->update(['average_cost' => $effectiveCost]);
            }

            $stock->update([
                'qty_on_hand' => $qtyAfter,
                'unit_cost' => $effectiveCost,
            ]);

            return StockMovement::query()->create([
                'organization_id' => $data->organizationId,
                'warehouse_id' => $data->warehouseId,
                'product_variant_id' => $data->productVariantId,
                'batch_id' => $data->batchId,
                'movement_type' => $data->movementType,
                'qty_before' => $qtyBefore,
                'qty_change' => $qtyChange,
                'qty_after' => $qtyAfter,
                'unit_cost' => $data->unitCost ?? $effectiveCost,
                'reference_type' => $data->referenceType,
                'reference_id' => $data->referenceId,
                'notes' => $data->notes,
                'created_by' => $data->actorId,
            ]);
        });
    }

    /**
     * @param  numeric-string  $quantity
     */
    public function reserve(
        int $organizationId,
        int $warehouseId,
        int $productVariantId,
        string $quantity,
        ?int $batchId = null,
    ): InventoryStock {
        return DB::transaction(function () use ($organizationId, $warehouseId, $productVariantId, $quantity, $batchId): InventoryStock {
            $stock = $this->lockOrCreateStock($organizationId, $warehouseId, $productVariantId, $batchId);

            /** @var numeric-string $qtyOnHand */
            $qtyOnHand = bcadd($stock->qty_on_hand, '0', 4);
            /** @var numeric-string $qtyReserved */
            $qtyReserved = bcadd($stock->qty_reserved, '0', 4);
            $available = bcsub($qtyOnHand, $qtyReserved, 4);

            if (bccomp($available, $quantity, 4) < 0) {
                throw new InsufficientStockException(
                    message: "Cannot reserve {$quantity} units for variant #{$productVariantId}; only {$available} available.",
                    productVariantId: $productVariantId,
                    availableQty: $available,
                    requestedQty: $quantity,
                );
            }

            $stock->update([
                'qty_reserved' => bcadd($qtyReserved, $quantity, 4),
            ]);

            return $stock->refresh();
        });
    }

    /**
     * @param  numeric-string  $quantity
     */
    public function releaseReservation(
        int $organizationId,
        int $warehouseId,
        int $productVariantId,
        string $quantity,
        ?int $batchId = null,
    ): InventoryStock {
        return DB::transaction(function () use ($organizationId, $warehouseId, $productVariantId, $quantity, $batchId): InventoryStock {
            $stock = $this->lockOrCreateStock($organizationId, $warehouseId, $productVariantId, $batchId);

            /** @var numeric-string $qtyReserved */
            $qtyReserved = bcadd($stock->qty_reserved, '0', 4);
            $nextReserved = bcsub($qtyReserved, $quantity, 4);
            if (bccomp($nextReserved, '0.0000', 4) < 0) {
                $nextReserved = '0.0000';
            }

            $stock->update(['qty_reserved' => $nextReserved]);

            return $stock->refresh();
        });
    }

    /**
     * @return array{checked_rows: int, discrepancy_count: int, discrepancies: list<array<string, mixed>>}
     */
    public function reconcile(int $organizationId, ?int $warehouseId = null): array
    {
        $stockQuery = InventoryStock::query()->where('organization_id', $organizationId);
        if ($warehouseId !== null) {
            $stockQuery->where('warehouse_id', $warehouseId);
        }

        $stocks = $stockQuery->orderBy('id')->get();
        $discrepancies = [];

        foreach ($stocks as $stock) {
            $ledgerSum = '0.0000';
            $movements = StockMovement::query()
                ->select(['id', 'qty_change'])
                ->where('organization_id', $organizationId)
                ->where('warehouse_id', $stock->warehouse_id)
                ->where('product_variant_id', $stock->product_variant_id)
                ->when(
                    $stock->batch_id !== null,
                    fn ($q) => $q->where('batch_id', $stock->batch_id),
                    fn ($q) => $q->whereNull('batch_id'),
                )
                ->cursor();

            foreach ($movements as $movement) {
                $ledgerSum = bcadd($ledgerSum, $movement->qty_change, 4);
            }

            $balance = bcadd($stock->qty_on_hand, '0', 4);

            if (bccomp($balance, $ledgerSum, 4) !== 0) {
                $discrepancies[] = [
                    'inventory_stock_id' => $stock->id,
                    'warehouse_id' => $stock->warehouse_id,
                    'product_variant_id' => $stock->product_variant_id,
                    'batch_id' => $stock->batch_id,
                    'balance_qty' => $balance,
                    'ledger_qty' => $ledgerSum,
                    'difference' => bcsub($balance, $ledgerSum, 4),
                ];
            }
        }

        return [
            'checked_rows' => $stocks->count(),
            'discrepancy_count' => count($discrepancies),
            'discrepancies' => $discrepancies,
        ];
    }

    private function lockOrCreateStock(
        int $organizationId,
        int $warehouseId,
        int $productVariantId,
        ?int $batchId,
    ): InventoryStock {
        $query = InventoryStock::query()
            ->where('warehouse_id', $warehouseId)
            ->where('product_variant_id', $productVariantId);

        if ($batchId !== null) {
            $query->where('batch_id', $batchId);
        } else {
            $query->whereNull('batch_id');
        }

        $stock = $query->lockForUpdate()->first();

        if ($stock instanceof InventoryStock) {
            return $stock;
        }

        $variant = ProductVariant::query()->find($productVariantId);
        $initialCost = $variant instanceof ProductVariant ? $variant->average_cost : '0.00';

        $created = InventoryStock::query()->create([
            'organization_id' => $organizationId,
            'warehouse_id' => $warehouseId,
            'product_variant_id' => $productVariantId,
            'batch_id' => $batchId,
            'qty_on_hand' => '0.0000',
            'qty_reserved' => '0.0000',
            'unit_cost' => $initialCost,
        ]);

        /** @var InventoryStock $locked */
        $locked = InventoryStock::query()->where('id', $created->id)->lockForUpdate()->firstOrFail();

        return $locked;
    }
}
