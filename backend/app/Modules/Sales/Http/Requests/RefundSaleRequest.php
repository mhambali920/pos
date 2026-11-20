<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Requests;

use App\Models\User;
use App\Modules\Sales\Models\Sale;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RefundSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $sale = $this->route('sale');

        return $user instanceof User
            && $sale instanceof Sale
            && $user->can('sales.refund')
            && $sale->organization_id === $user->organization_id
            && $user->canAccessStore($sale->store_id);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Sale|null $sale */
        $sale = $this->route('sale');
        $organizationId = $sale instanceof Sale ? $sale->organization_id : 0;
        $storeId = $sale instanceof Sale ? $sale->store_id : 0;

        return [
            'reason' => ['required', 'string', 'min:3', 'max:255'],
            'type' => ['nullable', Rule::in(['refund', 'exchange'])],
            'refund_method_id' => [
                'nullable',
                'integer',
                Rule::exists('payment_methods', 'id')->where('organization_id', $organizationId),
            ],
            'cash_register_session_id' => [
                'nullable',
                'integer',
                Rule::exists('cash_register_sessions', 'id')->where('store_id', $storeId),
            ],
            'exchange_sale_id' => [
                'nullable',
                'integer',
                Rule::exists('sales', 'id')->where('store_id', $storeId),
            ],
            'items' => ['required', 'array', 'min:1'],
            'items.*.sale_item_id' => [
                'required',
                'integer',
                Rule::exists('sale_items', 'id')->where('sale_id', $sale instanceof Sale ? $sale->id : 0),
            ],
            'items.*.quantity' => ['required', 'numeric'],
            'items.*.condition' => ['nullable', Rule::in(['resellable', 'damaged'])],
        ];
    }
}
