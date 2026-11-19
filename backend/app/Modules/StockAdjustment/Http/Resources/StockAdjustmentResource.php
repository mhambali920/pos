<?php

declare(strict_types=1);

namespace App\Modules\StockAdjustment\Http\Resources;

use App\Modules\StockAdjustment\Models\StockAdjustment;
use App\Modules\StockAdjustment\Models\StockAdjustmentItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockAdjustment
 */
class StockAdjustmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'warehouse_id' => $this->warehouse_id,
            'adjustment_number' => $this->adjustment_number,
            'reason' => $this->reason,
            'status' => $this->status,
            'approved_by' => $this->approved_by,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'warehouse' => $this->whenLoaded('warehouse', fn (): ?array => $this->warehouse !== null ? [
                'id' => $this->warehouse->id,
                'code' => $this->warehouse->code,
                'name' => $this->warehouse->name,
            ] : null),
            'items' => $this->whenLoaded('items', fn (): array => $this->items->map(
                fn (StockAdjustmentItem $item): array => [
                    'id' => $item->id,
                    'product_variant_id' => $item->product_variant_id,
                    'sku' => $item->relationLoaded('variant') ? $item->variant?->sku : null,
                    'direction' => $item->direction,
                    'quantity' => $item->quantity,
                    'unit_cost' => $item->unit_cost,
                    'notes' => $item->notes,
                ],
            )->values()->all()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
