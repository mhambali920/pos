<?php

declare(strict_types=1);

namespace App\Modules\Product\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $store_id
 * @property int $product_variant_id
 * @property string $selling_price
 * @property string|null $wholesale_price
 * @property string|null $min_selling_price
 * @property Carbon|null $effective_from
 * @property Carbon|null $effective_to
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ProductStorePrice extends Model
{
    protected $table = 'product_store_prices';

    protected $fillable = [
        'store_id',
        'product_variant_id',
        'selling_price',
        'wholesale_price',
        'min_selling_price',
        'effective_from',
        'effective_to',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'selling_price' => 'decimal:2',
            'wholesale_price' => 'decimal:2',
            'min_selling_price' => 'decimal:2',
            'effective_from' => 'datetime',
            'effective_to' => 'datetime',
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
