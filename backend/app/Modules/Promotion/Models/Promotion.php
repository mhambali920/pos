<?php

declare(strict_types=1);

namespace App\Modules\Promotion\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int|null $store_id
 * @property string $code
 * @property string $name
 * @property string $type
 * @property int $priority
 * @property bool $is_stackable
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property int|null $usage_limit
 * @property int $usage_count
 * @property numeric-string $min_purchase
 * @property numeric-string|null $max_discount
 * @property array<string, mixed> $rules
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Promotion extends Model
{
    protected $table = 'promotions';

    protected $fillable = [
        'organization_id',
        'store_id',
        'code',
        'name',
        'type',
        'priority',
        'is_stackable',
        'starts_at',
        'ends_at',
        'usage_limit',
        'usage_count',
        'min_purchase',
        'max_discount',
        'rules',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'priority' => 'integer',
            'is_stackable' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'usage_limit' => 'integer',
            'usage_count' => 'integer',
            'min_purchase' => 'decimal:2',
            'max_discount' => 'decimal:2',
            'rules' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<PromotionUsage, $this>
     */
    public function usages(): HasMany
    {
        return $this->hasMany(PromotionUsage::class, 'promotion_id');
    }
}
