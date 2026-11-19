<?php

declare(strict_types=1);

namespace App\Modules\Product\Http\Resources;

use App\Models\User;
use App\Modules\Product\Models\ProductBarcode;
use App\Modules\Product\Models\ProductBundle;
use App\Modules\Product\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductVariant
 */
class ProductVariantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewCost = $user instanceof User && $user->can('products.view_cost');

        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'sku' => $this->sku,
            'name' => $this->name,
            'attributes' => $this->attributes,
            'purchase_price' => $this->when($canViewCost, $this->purchase_price),
            'average_cost' => $this->when($canViewCost, $this->average_cost),
            'selling_price' => $this->selling_price,
            'wholesale_price' => $this->wholesale_price,
            'min_selling_price' => $this->min_selling_price,
            'min_stock' => $this->min_stock,
            'max_stock' => $this->max_stock,
            'reorder_point' => $this->reorder_point,
            'is_active' => $this->is_active,
            'barcodes' => $this->whenLoaded('barcodes', fn (): array => $this->barcodes->map(
                fn (ProductBarcode $b): array => [
                    'id' => $b->id,
                    'barcode' => $b->barcode,
                    'is_primary' => $b->is_primary,
                ],
            )->values()->all()),
            'bundle_components' => $this->whenLoaded('bundleComponents', fn (): array => $this->bundleComponents->map(
                fn (ProductBundle $c): array => [
                    'component_variant_id' => $c->component_variant_id,
                    'quantity' => $c->quantity,
                ],
            )->values()->all()),
        ];
    }
}
