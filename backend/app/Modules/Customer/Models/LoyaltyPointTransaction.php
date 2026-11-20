<?php

declare(strict_types=1);

namespace App\Modules\Customer\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $customer_id
 * @property int|null $sale_id
 * @property string $type
 * @property int $points
 * @property int $balance_after
 * @property string|null $notes
 * @property int|null $created_by
 * @property Carbon $created_at
 */
class LoyaltyPointTransaction extends Model
{
    public const null UPDATED_AT = null;

    protected $table = 'loyalty_point_transactions';

    protected $fillable = [
        'organization_id',
        'customer_id',
        'sale_id',
        'type',
        'points',
        'balance_after',
        'notes',
        'created_by',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'points' => 'integer',
            'balance_after' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
}
