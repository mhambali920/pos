<?php

declare(strict_types=1);

namespace App\Modules\Expense\Models;

use App\Models\User;
use App\Modules\CashManagement\Models\CashRegisterSession;
use App\Modules\Payment\Models\PaymentMethod;
use App\Modules\Store\Models\Store;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $organization_id
 * @property int $store_id
 * @property int $category_id
 * @property int|null $cash_register_session_id
 * @property int|null $payment_method_id
 * @property string $expense_number
 * @property Carbon $expense_date
 * @property numeric-string $amount
 * @property string $description
 * @property string|null $attachment_path
 * @property string $status
 * @property int $created_by
 * @property int|null $approved_by
 * @property Carbon|null $approved_at
 * @property string|null $rejection_reason
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Expense extends Model
{
    protected $table = 'expenses';

    protected $fillable = [
        'organization_id',
        'store_id',
        'category_id',
        'cash_register_session_id',
        'payment_method_id',
        'expense_number',
        'expense_date',
        'amount',
        'description',
        'attachment_path',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
        'rejection_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expense_date' => 'date',
            'amount' => 'decimal:2',
            'approved_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<ExpenseCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'category_id');
    }

    /**
     * @return BelongsTo<Store, $this>
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * @return BelongsTo<PaymentMethod, $this>
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_id');
    }

    /**
     * @return BelongsTo<CashRegisterSession, $this>
     */
    public function cashRegisterSession(): BelongsTo
    {
        return $this->belongsTo(CashRegisterSession::class, 'cash_register_session_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
