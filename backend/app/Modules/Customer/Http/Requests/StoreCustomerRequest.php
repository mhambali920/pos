<?php

declare(strict_types=1);

namespace App\Modules\Customer\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('customers.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();
        $orgId = $user instanceof User ? $user->organization_id : null;

        return [
            'customer_group_id' => [
                'nullable',
                'integer',
                Rule::exists('customer_groups', 'id')->where('organization_id', $orgId),
            ],
            'code' => [
                'required',
                'string',
                'max:32',
                Rule::unique('customers', 'code')->where('organization_id', $orgId),
            ],
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:1000'],
            'customer_type' => ['sometimes', 'in:walk_in,registered,member,wholesale'],
            'credit_limit' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
