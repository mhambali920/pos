<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('purchasing.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();
        $orgId = $user instanceof User ? $user->organization_id : null;

        return [
            'purchase_order_id' => ['required', 'integer', Rule::exists('purchase_orders', 'id')->where('organization_id', $orgId)],
            'supplier_invoice_number' => ['nullable', 'string', 'max:100'],
            'invoice_date' => ['sometimes', 'date'],
            'due_date' => ['sometimes', 'date', 'after_or_equal:invoice_date'],
            'grand_total' => ['sometimes', 'numeric', 'gt:0'],
        ];
    }
}
