<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $store_id
 * @property int $session_id
 * @property string $type
 * @property numeric-string $amount
 * @property string $reason
 * @property string|null $reference_type
 * @property int|null $reference_id
 * @property int $created_by
 * @property Carbon|null $created_at
 */
class CashRegisterMovement extends Model
{
    public const null UPDATED_AT = null;

    protected $table = 'cash_register_movements';

    protected $fillable = [
        'organization_id',
        'store_id',
        'session_id',
        'type',
        'amount',
        'reason',
        'reference_type',
        'reference_id',
        'created_by',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<CashRegisterSession, $this>
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(CashRegisterSession::class, 'session_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
