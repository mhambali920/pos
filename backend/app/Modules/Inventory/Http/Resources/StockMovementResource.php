<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Http\Resources;

use App\Modules\Inventory\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockMovement
 */
class StockMovementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'warehouse_id' => $this->warehouse_id,
            'product_variant_id' => $this->product_variant_id,
            'batch_id' => $this->batch_id,
            'movement_type' => $this->movement_type->value,
            'qty_before' => $this->qty_before,
            'qty_change' => $this->qty_change,
            'qty_after' => $this->qty_after,
            'unit_cost' => $this->unit_cost,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'warehouse' => $this->whenLoaded('warehouse', fn (): ?array => $this->warehouse !== null ? [
                'id' => $this->warehouse->id,
                'code' => $this->warehouse->code,
                'name' => $this->warehouse->name,
            ] : null),
            'variant' => $this->whenLoaded('variant', fn (): ?array => $this->variant !== null ? [
                'id' => $this->variant->id,
                'sku' => $this->variant->sku,
                'name' => $this->variant->name,
            ] : null),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
