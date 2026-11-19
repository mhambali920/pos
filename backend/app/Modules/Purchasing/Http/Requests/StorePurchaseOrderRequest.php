<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseOrderRequest extends FormRequest
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
            'supplier_id' => ['required', 'integer', Rule::exists('suppliers', 'id')->where('organization_id', $orgId)],
            'warehouse_id' => ['required', 'integer', Rule::exists('warehouses', 'id')->where('organization_id', $orgId)],
            'order_date' => ['sometimes', 'date'],
            'expected_date' => ['nullable', 'date', 'after_or_equal:order_date'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.qty_ordered' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount_amount' => ['sometimes', 'numeric', 'min:0'],
            'items.*.tax_rate' => ['sometimes', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
