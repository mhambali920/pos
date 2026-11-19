<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use App\Modules\Supplier\Models\Supplier;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $supplier_id
 * @property int $warehouse_id
 * @property string $po_number
 * @property Carbon $order_date
 * @property Carbon|null $expected_date
 * @property numeric-string $subtotal
 * @property numeric-string $discount_total
 * @property numeric-string $tax_total
 * @property numeric-string $grand_total
 * @property string $status
 * @property string|null $notes
 * @property int|null $created_by
 * @property int|null $approved_by
 * @property Carbon|null $approved_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PurchaseOrder extends Model
{
    protected $table = 'purchase_orders';

    protected $fillable = [
        'organization_id',
        'supplier_id',
        'warehouse_id',
        'po_number',
        'order_date',
        'expected_date',
        'subtotal',
        'discount_total',
        'tax_total',
        'grand_total',
        'status',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'order_date' => 'date',
            'expected_date' => 'date',
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'approved_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Supplier, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    /**
     * @return BelongsTo<Warehouse, $this>
     */
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    /**
     * @return HasMany<PurchaseOrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class, 'purchase_order_id');
    }
}
