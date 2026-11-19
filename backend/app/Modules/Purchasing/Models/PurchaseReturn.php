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
 * @property int $purchase_order_id
 * @property int $supplier_id
 * @property int $warehouse_id
 * @property string $return_number
 * @property string|null $credit_note_no
 * @property string $reason
 * @property numeric-string $total_amount
 * @property string $status
 * @property int|null $created_by
 * @property int|null $confirmed_by
 * @property Carbon|null $confirmed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PurchaseReturn extends Model
{
    protected $table = 'purchase_returns';

    protected $fillable = [
        'organization_id',
        'purchase_order_id',
        'supplier_id',
        'warehouse_id',
        'return_number',
        'credit_note_no',
        'reason',
        'total_amount',
        'status',
        'created_by',
        'confirmed_by',
        'confirmed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'confirmed_at' => 'datetime',
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
     * @return HasMany<PurchaseReturnItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PurchaseReturnItem::class, 'purchase_return_id');
    }
}
