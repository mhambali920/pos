<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $purchase_order_id
 * @property int $warehouse_id
 * @property string $grn_number
 * @property Carbon $received_at
 * @property string $status
 * @property string|null $notes
 * @property int|null $received_by
 * @property int|null $confirmed_by
 * @property Carbon|null $confirmed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class GoodsReceipt extends Model
{
    protected $table = 'goods_receipts';

    protected $fillable = [
        'organization_id',
        'purchase_order_id',
        'warehouse_id',
        'grn_number',
        'received_at',
        'status',
        'notes',
        'received_by',
        'confirmed_by',
        'confirmed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'confirmed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<PurchaseOrder, $this>
     */
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    /**
     * @return BelongsTo<Warehouse, $this>
     */
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    /**
     * @return HasMany<GoodsReceiptItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(GoodsReceiptItem::class, 'goods_receipt_id');
    }
}
