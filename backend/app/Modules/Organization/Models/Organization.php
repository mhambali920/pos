<?php

declare(strict_types=1);

namespace App\Modules\Organization\Models;

use App\Modules\Store\Models\Store;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $code
 * @property string $name
 * @property string|null $legal_name
 * @property string|null $tax_id
 * @property string $currency_code
 * @property string $inventory_valuation_method
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
class Organization extends Model
{
    use SoftDeletes;

    protected $table = 'organizations';

    protected $fillable = [
        'code',
        'name',
        'legal_name',
        'tax_id',
        'currency_code',
        'inventory_valuation_method',
        'status',
    ];

    /**
     * @return HasMany<Store, $this>
     */
    public function stores(): HasMany
    {
        return $this->hasMany(Store::class, 'organization_id');
    }
}
