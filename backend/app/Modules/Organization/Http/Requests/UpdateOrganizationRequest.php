<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('organizations.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'legal_name' => ['nullable', 'string', 'max:200'],
            'tax_id' => ['nullable', 'string', 'max:64'],
            'currency_code' => ['sometimes', 'string', 'size:3'],
            'inventory_valuation_method' => ['sometimes', 'in:mac,fifo'],
            'status' => ['sometimes', 'in:active,inactive'],
        ];
    }
}
