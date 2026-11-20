<?php

declare(strict_types=1);

namespace App\Modules\POS\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreatePosTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('pos.operate') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'cash_register_session_id' => ['nullable', 'integer'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'cart_discount' => ['sometimes', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'hold' => ['sometimes', 'boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.discount_amount' => ['sometimes', 'numeric', 'min:0'],
            'items.*.price_override' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
