<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Models;

use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $warehouse_id
 * @property int $product_variant_id
 * @property int|null $batch_id
 * @property StockMovementType $movement_type
 * @property numeric-string $qty_before
 * @property numeric-string $qty_change
 * @property numeric-string $qty_after
 * @property numeric-string $unit_cost
 * @property string $reference_type
 * @property int $reference_id
 * @property string|null $notes
 * @property int|null $created_by
 * @property Carbon $created_at
 */
class StockMovement extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'stock_movements';

    protected $fillable = [
        'organization_id',
        'warehouse_id',
        'product_variant_id',
        'batch_id',
        'movement_type',
        'qty_before',
        'qty_change',
        'qty_after',
        'unit_cost',
        'reference_type',
        'reference_id',
        'notes',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'movement_type' => StockMovementType::class,
            'qty_before' => 'decimal:4',
            'qty_change' => 'decimal:4',
            'qty_after' => 'decimal:4',
            'unit_cost' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Warehouse, $this>
     */
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
