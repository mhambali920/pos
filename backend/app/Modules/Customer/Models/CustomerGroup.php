<?php

declare(strict_types=1);

namespace App\Modules\Customer\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $code
 * @property string $name
 * @property string $discount_rate
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class CustomerGroup extends Model
{
    protected $table = 'customer_groups';

    protected $fillable = [
        'organization_id',
        'code',
        'name',
        'discount_rate',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'discount_rate' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }
}
