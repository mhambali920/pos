<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use App\Models\User;
use App\Modules\Payment\Models\PaymentMethod;
use App\Modules\Store\Models\Store;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $store_id
 * @property int $warehouse_id
 * @property int $sale_id
 * @property int|null $cash_register_session_id
 * @property string $return_number
 * @property string $type
 * @property string $reason
 * @property numeric-string $refund_amount
 * @property int|null $refund_method_id
 * @property int|null $exchange_sale_id
 * @property string $status
 * @property int|null $approved_by
 * @property int $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class SaleReturn extends Model
{
    protected $table = 'sale_returns';

    protected $fillable = [
        'organization_id',
        'store_id',
        'warehouse_id',
        'sale_id',
        'cash_register_session_id',
        'return_number',
        'type',
        'reason',
        'refund_amount',
        'refund_method_id',
        'exchange_sale_id',
        'status',
        'approved_by',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'refund_amount' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Sale, $this>
     */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * @return BelongsTo<Warehouse, $this>
     */
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    /**
     * @return BelongsTo<PaymentMethod, $this>
     */
    public function refundMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'refund_method_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * @return HasMany<SaleReturnItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(SaleReturnItem::class, 'sale_return_id');
    }
}
