<?php

declare(strict_types=1);

namespace App\Modules\Notification\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int|null $store_id
 * @property int $user_id
 * @property string $type
 * @property string $title
 * @property string $body
 * @property array<string, mixed>|null $data
 * @property string $channel
 * @property Carbon|null $read_at
 * @property Carbon $created_at
 */
class AppNotification extends Model
{
    public const null UPDATED_AT = null;

    protected $table = 'app_notifications';

    protected $fillable = [
        'organization_id',
        'store_id',
        'user_id',
        'type',
        'title',
        'body',
        'data',
        'channel',
        'read_at',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}
