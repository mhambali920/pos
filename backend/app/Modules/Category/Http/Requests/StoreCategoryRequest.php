<?php

declare(strict_types=1);

namespace App\Modules\Category\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends FormRequest
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
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('categories', 'id')->where('organization_id', $orgId),
            ],
            'code' => [
                'required',
                'string',
                'max:32',
                Rule::unique('categories', 'code')->where('organization_id', $orgId),
            ],
            'name' => ['required', 'string', 'max:150'],
            'slug' => [
                'nullable',
                'string',
                'max:160',
                Rule::unique('categories', 'slug')->where('organization_id', $orgId),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
