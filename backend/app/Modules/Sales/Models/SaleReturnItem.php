<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use App\Modules\Product\Models\ProductVariant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $sale_return_id
 * @property int $sale_item_id
 * @property int $product_variant_id
 * @property numeric-string $quantity
 * @property numeric-string $unit_price
 * @property numeric-string $tax_amount
 * @property numeric-string $refund_subtotal
 * @property string $condition
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class SaleReturnItem extends Model
{
    protected $table = 'sale_return_items';

    protected $fillable = [
        'sale_return_id',
        'sale_item_id',
        'product_variant_id',
        'quantity',
        'unit_price',
        'tax_amount',
        'refund_subtotal',
        'condition',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'unit_price' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'refund_subtotal' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<SaleReturn, $this>
     */
    public function saleReturn(): BelongsTo
    {
        return $this->belongsTo(SaleReturn::class, 'sale_return_id');
    }

    /**
     * @return BelongsTo<SaleItem, $this>
     */
    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class, 'sale_item_id');
    }

    /**
     * @return BelongsTo<ProductVariant, $this>
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
