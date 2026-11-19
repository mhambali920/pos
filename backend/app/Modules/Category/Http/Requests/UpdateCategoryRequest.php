<?php

declare(strict_types=1);

namespace App\Modules\Category\Http\Requests;

use App\Models\User;
use App\Modules\Category\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('products.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();
        $orgId = $user instanceof User ? $user->organization_id : null;
        $category = $this->route('category');
        $categoryId = $category instanceof Category ? $category->id : null;

        return [
            'parent_id' => [
                'nullable',
                'integer',
                Rule::notIn([$categoryId]),
                Rule::exists('categories', 'id')->where('organization_id', $orgId),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:160',
                Rule::unique('categories', 'slug')->where('organization_id', $orgId)->ignore($categoryId),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
