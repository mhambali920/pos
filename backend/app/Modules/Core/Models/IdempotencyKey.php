<?php

declare(strict_types=1);

namespace App\Modules\Core\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $organization_id
 * @property int $user_id
 * @property string $key
 * @property string $request_path
 * @property string $request_hash
 * @property int $response_status
 * @property string $response_body
 * @property Carbon $expires_at
 * @property Carbon $created_at
 */
class IdempotencyKey extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'idempotency_keys';

    protected $fillable = [
        'organization_id',
        'user_id',
        'key',
        'request_path',
        'request_hash',
        'response_status',
        'response_body',
        'expires_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}
