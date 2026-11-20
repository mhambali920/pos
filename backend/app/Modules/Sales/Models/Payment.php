<?php

declare(strict_types=1);

namespace App\Modules\Sales\Models;

use App\Modules\Payment\Models\PaymentMethod;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $store_id
 * @property int $sale_id
 * @property int $payment_method_id
 * @property numeric-string $amount
 * @property numeric-string $tendered_amount
 * @property numeric-string $change_amount
 * @property string $status
 * @property string|null $external_reference
 * @property array<string, mixed>|null $gateway_payload
 * @property Carbon|null $paid_at
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Payment extends Model
{
    protected $table = 'payments';

    protected $fillable = [
        'organization_id',
        'store_id',
        'sale_id',
        'payment_method_id',
        'amount',
        'tendered_amount',
        'change_amount',
        'status',
        'external_reference',
        'gateway_payload',
        'paid_at',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'tendered_amount' => 'decimal:2',
            'change_amount' => 'decimal:2',
            'gateway_payload' => 'array',
            'paid_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Sale, $this>
     */
    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }

    /**
     * @return BelongsTo<PaymentMethod, $this>
     */
    public function method(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }
}
