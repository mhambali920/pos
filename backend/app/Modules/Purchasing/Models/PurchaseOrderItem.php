<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use App\Modules\Product\Models\ProductVariant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $purchase_order_id
 * @property int $product_variant_id
 * @property string $sku_snapshot
 * @property string $product_name_snapshot
 * @property numeric-string $qty_ordered
 * @property numeric-string $qty_received
 * @property numeric-string $unit_price
 * @property numeric-string $discount_amount
 * @property numeric-string $tax_rate
 * @property numeric-string $tax_amount
 * @property numeric-string $line_total
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PurchaseOrderItem extends Model
{
    protected $table = 'purchase_order_items';

    protected $fillable = [
        'purchase_order_id',
        'product_variant_id',
        'sku_snapshot',
        'product_name_snapshot',
        'qty_ordered',
        'qty_received',
        'unit_price',
        'discount_amount',
        'tax_rate',
        'tax_amount',
        'line_total',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'qty_ordered' => 'decimal:4',
            'qty_received' => 'decimal:4',
            'unit_price' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_rate' => 'decimal:4',
            'tax_amount' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
