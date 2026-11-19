<?php

declare(strict_types=1);

namespace App\Modules\Product\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int|null $store_id
 * @property int $product_variant_id
 * @property string $price_type
 * @property string|null $old_price
 * @property string $new_price
 * @property string|null $reason
 * @property int|null $changed_by
 * @property Carbon $created_at
 */
class ProductPriceHistory extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'product_price_histories';

    protected $fillable = [
        'organization_id',
        'store_id',
        'product_variant_id',
        'price_type',
        'old_price',
        'new_price',
        'reason',
        'changed_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'old_price' => 'decimal:2',
            'new_price' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }
}
