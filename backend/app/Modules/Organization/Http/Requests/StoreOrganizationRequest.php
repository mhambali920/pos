<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('organizations.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:32', 'unique:organizations,code'],
            'name' => ['required', 'string', 'max:150'],
            'legal_name' => ['nullable', 'string', 'max:200'],
            'tax_id' => ['nullable', 'string', 'max:64'],
            'currency_code' => ['sometimes', 'string', 'size:3'],
            'inventory_valuation_method' => ['sometimes', 'in:mac,fifo'],
            'status' => ['sometimes', 'in:active,inactive'],
        ];
    }
}
