<?php

declare(strict_types=1);

namespace App\Modules\Promotion\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $promotion_id
 * @property int|null $sale_id
 * @property int|null $customer_id
 * @property numeric-string $discount_amount
 * @property Carbon $used_at
 */
class PromotionUsage extends Model
{
    public const null CREATED_AT = null;

    public const null UPDATED_AT = null;

    protected $table = 'promotion_usages';

    protected $fillable = [
        'organization_id',
        'promotion_id',
        'sale_id',
        'customer_id',
        'discount_amount',
        'used_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'discount_amount' => 'decimal:2',
            'used_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Promotion, $this>
     */
    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class, 'promotion_id');
    }
}
