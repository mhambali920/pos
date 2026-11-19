<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $goods_receipt_id
 * @property int $purchase_order_item_id
 * @property int $product_variant_id
 * @property int|null $batch_id
 * @property numeric-string $qty_received
 * @property numeric-string $qty_damaged
 * @property numeric-string $unit_cost
 * @property string|null $discrepancy_notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class GoodsReceiptItem extends Model
{
    protected $table = 'goods_receipt_items';

    protected $fillable = [
        'goods_receipt_id',
        'purchase_order_item_id',
        'product_variant_id',
        'batch_id',
        'qty_received',
        'qty_damaged',
        'unit_cost',
        'discrepancy_notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'qty_received' => 'decimal:4',
            'qty_damaged' => 'decimal:4',
            'unit_cost' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<PurchaseOrderItem, $this>
     */
    public function purchaseOrderItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrderItem::class, 'purchase_order_item_id');
    }
}
