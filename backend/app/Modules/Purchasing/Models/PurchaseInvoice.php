<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Models;

use App\Modules\Supplier\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $purchase_order_id
 * @property int $supplier_id
 * @property string $invoice_number
 * @property string|null $supplier_invoice_number
 * @property Carbon $invoice_date
 * @property Carbon $due_date
 * @property numeric-string $grand_total
 * @property numeric-string $paid_amount
 * @property string $payment_status
 * @property int|null $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class PurchaseInvoice extends Model
{
    protected $table = 'purchase_invoices';

    protected $fillable = [
        'organization_id',
        'purchase_order_id',
        'supplier_id',
        'invoice_number',
        'supplier_invoice_number',
        'invoice_date',
        'due_date',
        'grand_total',
        'paid_amount',
        'payment_status',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'due_date' => 'date',
            'grand_total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Supplier, $this>
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    /**
     * @return BelongsTo<PurchaseOrder, $this>
     */
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    /**
     * @return HasMany<PurchasePayment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(PurchasePayment::class, 'purchase_invoice_id');
    }
}
