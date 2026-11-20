<?php

declare(strict_types=1);

namespace App\Modules\Payment\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $code
 * @property string $name
 * @property string $type
 * @property string|null $gateway_driver
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PaymentMethod extends Model
{
    protected $table = 'payment_methods';

    protected $fillable = [
        'organization_id',
        'code',
        'name',
        'type',
        'gateway_driver',
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
}
