<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGoodsReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('purchasing.receive') ?? false;
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
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.purchase_order_item_id' => ['required', 'integer', 'exists:purchase_order_items,id'],
            'items.*.batch_id' => ['nullable', 'integer', 'exists:stock_batches,id'],
            'items.*.qty_received' => ['required', 'numeric', 'gt:0'],
            'items.*.qty_damaged' => ['sometimes', 'numeric', 'min:0'],
            'items.*.discrepancy_notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
