<?php

declare(strict_types=1);

namespace App\Modules\Product\Http\Requests;

use App\Models\User;
use App\Modules\Product\Domain\Enums\ProductType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
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
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('organization_id', $orgId)],
            'brand_id' => ['nullable', 'integer', Rule::exists('brands', 'id')->where('organization_id', $orgId)],
            'base_unit_id' => ['required', 'integer', Rule::exists('units', 'id')->where('organization_id', $orgId)],
            'tax_id' => ['nullable', 'integer', Rule::exists('taxes', 'id')->where('organization_id', $orgId)],
            'supplier_id' => ['nullable', 'integer', Rule::exists('suppliers', 'id')->where('organization_id', $orgId)],
            'product_type' => ['required', Rule::enum(ProductType::class)],
            'name' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'image_path' => ['nullable', 'string', 'max:500'],
            'track_inventory' => ['sometimes', 'boolean'],
            'track_batch' => ['sometimes', 'boolean'],
            'track_serial' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'variants' => ['required', 'array', 'min:1'],
            'variants.*.sku' => ['required', 'string', 'max:64', 'distinct', 'unique:product_variants,sku'],
            'variants.*.name' => ['nullable', 'string', 'max:200'],
            'variants.*.attributes' => ['nullable', 'array'],
            'variants.*.purchase_price' => ['sometimes', 'numeric', 'min:0'],
            'variants.*.selling_price' => ['required', 'numeric', 'min:0'],
            'variants.*.wholesale_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.min_selling_price' => ['sometimes', 'numeric', 'min:0'],
            'variants.*.min_stock' => ['sometimes', 'numeric', 'min:0'],
            'variants.*.max_stock' => ['nullable', 'numeric', 'min:0'],
            'variants.*.reorder_point' => ['sometimes', 'numeric', 'min:0'],
            'variants.*.barcodes' => ['sometimes', 'array'],
            'variants.*.barcodes.*' => [
                'string',
                'max:100',
                'distinct',
                Rule::unique('product_barcodes', 'barcode')->where('organization_id', $orgId),
            ],
            'variants.*.bundle_components' => ['sometimes', 'array'],
            'variants.*.bundle_components.*.component_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'variants.*.bundle_components.*.quantity' => ['required', 'numeric', 'gt:0'],
        ];
    }
}
