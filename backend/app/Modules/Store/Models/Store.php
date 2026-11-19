<?php

declare(strict_types=1);

namespace App\Modules\Store\Models;

use App\Models\User;
use App\Modules\Organization\Models\Organization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property string $code
 * @property string $name
 * @property string|null $address
 * @property string|null $phone
 * @property string|null $email
 * @property string $timezone
 * @property array<string, mixed>|null $operating_hours
 * @property int|null $default_tax_id
 * @property bool $allow_negative_stock
 * @property array<string, mixed>|null $cashier_config
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
class Store extends Model
{
    use SoftDeletes;

    protected $table = 'stores';

    protected $fillable = [
        'organization_id',
        'code',
        'name',
        'address',
        'phone',
        'email',
        'timezone',
        'operating_hours',
        'default_tax_id',
        'allow_negative_stock',
        'cashier_config',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'operating_hours' => 'array',
            'cashier_config' => 'array',
            'allow_negative_stock' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_store_assignments', 'store_id', 'user_id')
            ->withPivot(['warehouse_id', 'is_default'])
            ->withTimestamps();
    }
}
