<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use App\Modules\Product\Models\ProductVariant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $sale_id
 * @property int $product_variant_id
 * @property string $sku_snapshot
 * @property string|null $barcode_snapshot
 * @property string $product_name_snapshot
 * @property string|null $unit_name_snapshot
 * @property numeric-string $quantity
 * @property numeric-string $unit_price_snapshot
 * @property numeric-string $cost_price_snapshot
 * @property numeric-string $discount_amount
 * @property numeric-string $tax_rate_snapshot
 * @property string $tax_type_snapshot
 * @property numeric-string $tax_amount
 * @property numeric-string $line_total
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class SaleItem extends Model
{
    protected $table = 'sale_items';

    protected $fillable = [
        'sale_id',
        'product_variant_id',
        'sku_snapshot',
        'barcode_snapshot',
        'product_name_snapshot',
        'unit_name_snapshot',
        'quantity',
        'unit_price_snapshot',
        'cost_price_snapshot',
        'discount_amount',
        'tax_rate_snapshot',
        'tax_type_snapshot',
        'tax_amount',
        'line_total',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'unit_price_snapshot' => 'decimal:2',
            'cost_price_snapshot' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_rate_snapshot' => 'decimal:4',
            'tax_amount' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Sale, $this>
     */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
