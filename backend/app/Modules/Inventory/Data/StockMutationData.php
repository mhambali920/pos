<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Data;

use App\Modules\Inventory\Domain\Enums\StockMovementType;

final readonly class StockMutationData
{
    /**
     * @param  numeric-string  $qtyChange  Positive for stock in, negative for stock out.
     * @param  numeric-string|null  $unitCost  Incoming unit cost for MAC valuation (null uses existing cost).
     */
    public function __construct(
        public int $organizationId,
        public int $warehouseId,
        public int $productVariantId,
        public StockMovementType $movementType,
        public string $qtyChange,
        public string $referenceType,
        public int $referenceId,
        public ?int $batchId = null,
        public ?string $unitCost = null,
        public ?string $notes = null,
        public ?int $actorId = null,
        public bool $allowNegativeStock = false,
    ) {}
}
