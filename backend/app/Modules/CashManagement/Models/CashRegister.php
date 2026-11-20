<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Models;

use App\Modules\Store\Models\Store;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $store_id
 * @property string $code
 * @property string $name
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class CashRegister extends Model
{
    protected $table = 'cash_registers';

    protected $fillable = [
        'organization_id',
        'store_id',
        'code',
        'name',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
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
     * @return HasMany<CashRegisterSession, $this>
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(CashRegisterSession::class, 'cash_register_id');
    }
}
