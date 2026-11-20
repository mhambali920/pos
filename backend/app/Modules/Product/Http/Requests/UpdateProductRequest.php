<?php

declare(strict_types=1);

namespace App\Modules\Product\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
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

        return [
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('organization_id', $orgId)],
            'brand_id' => ['nullable', 'integer', Rule::exists('brands', 'id')->where('organization_id', $orgId)],
            'base_unit_id' => ['sometimes', 'required', 'integer', Rule::exists('units', 'id')->where('organization_id', $orgId)],
            'tax_id' => ['nullable', 'integer', Rule::exists('taxes', 'id')->where('organization_id', $orgId)],
            'supplier_id' => ['nullable', 'integer', Rule::exists('suppliers', 'id')->where('organization_id', $orgId)],
            'name' => ['sometimes', 'required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'image_path' => ['nullable', 'string', 'max:500'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'track_inventory' => ['sometimes', 'boolean'],
            'track_batch' => ['sometimes', 'boolean'],
            'track_serial' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'price_change_reason' => ['nullable', 'string', 'max:255'],
            'variants' => ['sometimes', 'array'],
            'variants.*.id' => ['required', 'integer', 'exists:product_variants,id'],
            'variants.*.name' => ['sometimes', 'string', 'max:200'],
            'variants.*.attributes' => ['nullable', 'array'],
            'variants.*.purchase_price' => ['sometimes', 'numeric', 'min:0'],
            'variants.*.selling_price' => ['sometimes', 'numeric', 'min:0'],
            'variants.*.wholesale_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.min_selling_price' => ['sometimes', 'numeric', 'min:0'],
            'variants.*.min_stock' => ['sometimes', 'numeric', 'min:0'],
            'variants.*.max_stock' => ['nullable', 'numeric', 'min:0'],
            'variants.*.reorder_point' => ['sometimes', 'numeric', 'min:0'],
            'variants.*.is_active' => ['sometimes', 'boolean'],
        ];
    }
}
