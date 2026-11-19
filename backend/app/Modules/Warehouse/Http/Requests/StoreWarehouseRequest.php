<?php

declare(strict_types=1);

namespace App\Modules\Warehouse\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWarehouseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('warehouses.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();
        $orgId = $user instanceof User ? $user->organization_id : null;

        return [
            'store_id' => [
                'nullable',
                'integer',
                Rule::exists('stores', 'id')->where('organization_id', $orgId),
            ],
            'code' => [
                'required',
                'string',
                'max:32',
                Rule::unique('warehouses', 'code')->where('organization_id', $orgId),
            ],
            'name' => ['required', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:1000'],
            'is_default' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'in:active,inactive'],
        ];
    }
}
