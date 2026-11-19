<?php

declare(strict_types=1);

namespace App\Modules\Product\Http\Resources;

use App\Modules\Product\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'product_type' => $this->product_type->value,
            'name' => $this->name,
            'description' => $this->description,
            'image_path' => $this->image_path,
            'track_inventory' => $this->track_inventory,
            'track_batch' => $this->track_batch,
            'track_serial' => $this->track_serial,
            'is_active' => $this->is_active,
            'category' => $this->whenLoaded('category', fn (): ?array => $this->category !== null ? [
                'id' => $this->category->id,
                'code' => $this->category->code,
                'name' => $this->category->name,
            ] : null),
            'brand' => $this->whenLoaded('brand', fn (): ?array => $this->brand !== null ? [
                'id' => $this->brand->id,
                'code' => $this->brand->code,
                'name' => $this->brand->name,
            ] : null),
            'base_unit' => $this->whenLoaded('baseUnit', fn (): ?array => $this->baseUnit !== null ? [
                'id' => $this->baseUnit->id,
                'code' => $this->baseUnit->code,
                'name' => $this->baseUnit->name,
            ] : null),
            'tax' => $this->whenLoaded('tax', fn (): ?array => $this->tax !== null ? [
                'id' => $this->tax->id,
                'code' => $this->tax->code,
                'name' => $this->tax->name,
                'rate' => $this->tax->rate,
                'type' => $this->tax->type,
            ] : null),
            'supplier' => $this->whenLoaded('supplier', fn (): ?array => $this->supplier !== null ? [
                'id' => $this->supplier->id,
                'code' => $this->supplier->code,
                'company_name' => $this->supplier->company_name,
            ] : null),
            'variants' => ProductVariantResource::collection($this->whenLoaded('variants'))->resolve($request),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
