<?php

declare(strict_types=1);

namespace App\Modules\Unit\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('products.create') ?? false;
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
                'max:24',
                Rule::unique('units', 'code')->where('organization_id', $orgId),
            ],
            'name' => ['required', 'string', 'max:100'],
            'allow_decimal' => ['sometimes', 'boolean'],
        ];
    }
}
