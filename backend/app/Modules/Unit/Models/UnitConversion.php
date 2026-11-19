<?php

declare(strict_types=1);

namespace App\Modules\Unit\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $from_unit_id
 * @property int $to_unit_id
 * @property string $multiplier
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class UnitConversion extends Model
{
    protected $table = 'unit_conversions';

    protected $fillable = [
        'organization_id',
        'from_unit_id',
        'to_unit_id',
        'multiplier',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'multiplier' => 'decimal:4',
        ];
    }

    /**
     * @return BelongsTo<Unit, $this>
     */
    public function toUnit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'to_unit_id');
    }
}
