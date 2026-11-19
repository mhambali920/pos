<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $purchase_invoice_id
 * @property string $payment_number
 * @property string $payment_method
 * @property numeric-string $amount
 * @property Carbon $paid_at
 * @property string|null $reference_no
 * @property string|null $notes
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PurchasePayment extends Model
{
    protected $table = 'purchase_payments';

    protected $fillable = [
        'organization_id',
        'purchase_invoice_id',
        'payment_number',
        'payment_method',
        'amount',
        'paid_at',
        'reference_no',
        'notes',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<PurchaseInvoice, $this>
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(PurchaseInvoice::class, 'purchase_invoice_id');
    }
}
