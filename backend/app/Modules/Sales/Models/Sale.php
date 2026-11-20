<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use App\Models\User;
use App\Modules\Customer\Models\Customer;
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
 * @property int|null $cash_register_session_id
 * @property int|null $customer_id
 * @property int $cashier_id
 * @property string $transaction_number
 * @property string $status
 * @property numeric-string $subtotal
 * @property numeric-string $discount_total
 * @property numeric-string $tax_total
 * @property numeric-string $rounding_amount
 * @property numeric-string $grand_total
 * @property numeric-string $paid_total
 * @property numeric-string $change_amount
 * @property string|null $notes
 * @property Carbon|null $completed_at
 * @property Carbon|null $cancelled_at
 * @property int|null $cancelled_by
 * @property string|null $cancellation_reason
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Sale extends Model
{
    protected $table = 'sales';

    protected $fillable = [
        'organization_id',
        'store_id',
        'warehouse_id',
        'cash_register_session_id',
        'customer_id',
        'cashier_id',
        'transaction_number',
        'status',
        'subtotal',
        'discount_total',
        'tax_total',
        'rounding_amount',
        'grand_total',
        'paid_total',
        'change_amount',
        'notes',
        'completed_at',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'rounding_amount' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'paid_total' => 'decimal:2',
            'change_amount' => 'decimal:2',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
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
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    /**
     * @return HasMany<SaleItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class, 'sale_id');
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'sale_id');
    }

    /**
     * @return HasMany<SaleReturn, $this>
     */
    public function returns(): HasMany
    {
        return $this->hasMany(SaleReturn::class, 'sale_id');
    }
}
