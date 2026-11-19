<?php

declare(strict_types=1);

namespace App\Modules\Unit\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $code
 * @property string $name
 * @property bool $allow_decimal
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Unit extends Model
{
    protected $table = 'units';

    protected $fillable = [
        'organization_id',
        'code',
        'name',
        'allow_decimal',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'allow_decimal' => 'boolean',
        ];
    }

    /**
     * @return HasMany<UnitConversion, $this>
     */
    public function conversionsFrom(): HasMany
    {
        return $this->hasMany(UnitConversion::class, 'from_unit_id');
    }
}
