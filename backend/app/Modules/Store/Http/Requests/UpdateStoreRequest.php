<?php

declare(strict_types=1);

namespace App\Modules\Store\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('stores.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:1000'],
            'phone' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:150'],
            'timezone' => ['sometimes', 'timezone:all'],
            'operating_hours' => ['nullable', 'array'],
            'allow_negative_stock' => ['sometimes', 'boolean'],
            'cashier_config' => ['nullable', 'array'],
            'status' => ['sometimes', 'in:active,inactive'],
        ];
    }
}
