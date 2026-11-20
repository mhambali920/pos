<?php

declare(strict_types=1);

namespace App\Modules\Expense\Http\Requests;

use App\Models\User;
use App\Modules\Store\Models\Store;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->can('expenses.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Store|null $store */
        $store = $this->attributes->get('active_store');
        $organizationId = $store instanceof Store ? $store->organization_id : 0;
        $storeId = $store instanceof Store ? $store->id : 0;

        return [
            'category_id' => [
                'required',
                'integer',
                Rule::exists('expense_categories', 'id')->where('organization_id', $organizationId),
            ],
            'expense_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'description' => ['required', 'string', 'min:3', 'max:1000'],
            'payment_method_id' => [
                'nullable',
                'integer',
                Rule::exists('payment_methods', 'id')->where('organization_id', $organizationId),
            ],
            'cash_register_session_id' => [
                'nullable',
                'integer',
                Rule::exists('cash_register_sessions', 'id')->where('store_id', $storeId),
            ],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
        ];
    }
}
