<?php

declare(strict_types=1);

namespace App\Modules\Store\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('stores.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();
        $orgId = $user instanceof User ? $user->organization_id : null;

        return [
            'code' => [
                'required',
                'string',
                'max:32',
                Rule::unique('stores', 'code')->where('organization_id', $orgId),
            ],
            'name' => ['required', 'string', 'max:150'],
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
