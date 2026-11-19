<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Contracts;

use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Inventory\Models\StockMovement;

interface InventoryLedgerContract
{
    public function mutate(StockMutationData $data): StockMovement;

    /**
     * @param  numeric-string  $quantity
     */
    public function reserve(
        int $organizationId,
        int $warehouseId,
        int $productVariantId,
        string $quantity,
        ?int $batchId = null,
    ): InventoryStock;

    /**
     * @param  numeric-string  $quantity
     */
    public function releaseReservation(
        int $organizationId,
        int $warehouseId,
        int $productVariantId,
        string $quantity,
        ?int $batchId = null,
    ): InventoryStock;

    /**
     * Compare inventory_stocks balances against SUM(stock_movements.qty_change).
     *
     * @return array{checked_rows: int, discrepancy_count: int, discrepancies: list<array<string, mixed>>}
     */
    public function reconcile(int $organizationId, ?int $warehouseId = null): array;
}
