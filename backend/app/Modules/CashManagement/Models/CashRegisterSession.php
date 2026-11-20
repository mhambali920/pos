<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Models;

use App\Models\User;
use App\Modules\Store\Models\Store;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $store_id
 * @property int $cash_register_id
 * @property int $user_id
 * @property Carbon $opened_at
 * @property Carbon|null $closed_at
 * @property numeric-string $opening_balance
 * @property numeric-string $expected_cash
 * @property numeric-string|null $actual_cash
 * @property numeric-string|null $cash_difference
 * @property string $status
 * @property string|null $closing_notes
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class CashRegisterSession extends Model
{
    protected $table = 'cash_register_sessions';

    protected $fillable = [
        'organization_id',
        'store_id',
        'cash_register_id',
        'user_id',
        'opened_at',
        'closed_at',
        'opening_balance',
        'expected_cash',
        'actual_cash',
        'cash_difference',
        'status',
        'closing_notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'opening_balance' => 'decimal:2',
            'expected_cash' => 'decimal:2',
            'actual_cash' => 'decimal:2',
            'cash_difference' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<CashRegister, $this>
     */
    public function register(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class, 'cash_register_id');
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return HasMany<CashRegisterMovement, $this>
     */
    public function movements(): HasMany
    {
        return $this->hasMany(CashRegisterMovement::class, 'session_id');
    }
}
