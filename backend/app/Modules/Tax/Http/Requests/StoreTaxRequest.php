<?php

declare(strict_types=1);

namespace App\Modules\Tax\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaxRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('settings.update') ?? false;
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
                Rule::unique('taxes', 'code')->where('organization_id', $orgId),
            ],
            'name' => ['required', 'string', 'max:100'],
            'rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'type' => ['required', 'in:inclusive,exclusive'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
