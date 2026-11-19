<?php

declare(strict_types=1);

namespace App\Modules\Product\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $product_id
 * @property string $sku
 * @property string $name
 * @property array<string, mixed>|null $attributes
 * @property string $purchase_price
 * @property string $selling_price
 * @property string|null $wholesale_price
 * @property string $min_selling_price
 * @property string $average_cost
 * @property string $min_stock
 * @property string|null $max_stock
 * @property string $reorder_point
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
class ProductVariant extends Model
{
    use SoftDeletes;

    protected $table = 'product_variants';

    protected $fillable = [
        'product_id',
        'sku',
        'name',
        'attributes',
        'purchase_price',
        'selling_price',
        'wholesale_price',
        'min_selling_price',
        'average_cost',
        'min_stock',
        'max_stock',
        'reorder_point',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attributes' => 'array',
            'purchase_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'wholesale_price' => 'decimal:2',
            'min_selling_price' => 'decimal:2',
            'average_cost' => 'decimal:2',
            'min_stock' => 'decimal:4',
            'max_stock' => 'decimal:4',
            'reorder_point' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * @return HasMany<ProductBarcode, $this>
     */
    public function barcodes(): HasMany
    {
        return $this->hasMany(ProductBarcode::class, 'product_variant_id');
    }

    /**
     * @return HasMany<ProductBundle, $this>
     */
    public function bundleComponents(): HasMany
    {
        return $this->hasMany(ProductBundle::class, 'bundle_variant_id');
    }

    /**
     * @return HasMany<ProductStorePrice, $this>
     */
    public function storePrices(): HasMany
    {
        return $this->hasMany(ProductStorePrice::class, 'product_variant_id');
    }

    /**
     * @return HasMany<ProductPriceHistory, $this>
     */
    public function priceHistories(): HasMany
    {
        return $this->hasMany(ProductPriceHistory::class, 'product_variant_id');
    }
}
