<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Models;

use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $warehouse_id
 * @property string $opname_number
 * @property string $status
 * @property string|null $notes
 * @property int|null $created_by
 * @property int|null $finalized_by
 * @property Carbon|null $finalized_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class StockOpname extends Model
{
    protected $table = 'stock_opnames';

    protected $fillable = [
        'organization_id',
        'warehouse_id',
        'opname_number',
        'status',
        'notes',
        'created_by',
        'finalized_by',
        'finalized_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'finalized_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Warehouse, $this>
     */
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    /**
     * @return HasMany<StockOpnameItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(StockOpnameItem::class, 'stock_opname_id');
    }
}
