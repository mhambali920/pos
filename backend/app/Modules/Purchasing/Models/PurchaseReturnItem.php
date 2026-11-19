<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $purchase_return_id
 * @property int $product_variant_id
 * @property int|null $batch_id
 * @property numeric-string $quantity
 * @property numeric-string $unit_cost
 * @property numeric-string $line_total
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PurchaseReturnItem extends Model
{
    protected $table = 'purchase_return_items';

    protected $fillable = [
        'purchase_return_id',
        'product_variant_id',
        'batch_id',
        'quantity',
        'unit_cost',
        'line_total',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:4',
            'unit_cost' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }
}
