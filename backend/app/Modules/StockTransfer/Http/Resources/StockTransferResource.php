<?php

declare(strict_types=1);

namespace App\Modules\StockTransfer\Http\Resources;

use App\Modules\StockTransfer\Models\StockTransfer;
use App\Modules\StockTransfer\Models\StockTransferItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockTransfer
 */
class StockTransferResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transfer_number' => $this->transfer_number,
            'from_warehouse_id' => $this->from_warehouse_id,
            'to_warehouse_id' => $this->to_warehouse_id,
            'status' => $this->status,
            'notes' => $this->notes,
            'shipped_at' => $this->shipped_at?->toIso8601String(),
            'received_at' => $this->received_at?->toIso8601String(),
            'from_warehouse' => $this->whenLoaded('fromWarehouse', fn (): ?array => $this->fromWarehouse !== null ? [
                'id' => $this->fromWarehouse->id,
                'code' => $this->fromWarehouse->code,
                'name' => $this->fromWarehouse->name,
            ] : null),
            'to_warehouse' => $this->whenLoaded('toWarehouse', fn (): ?array => $this->toWarehouse !== null ? [
                'id' => $this->toWarehouse->id,
                'code' => $this->toWarehouse->code,
                'name' => $this->toWarehouse->name,
            ] : null),
            'items' => $this->whenLoaded('items', fn (): array => $this->items->map(
                fn (StockTransferItem $item): array => [
                    'id' => $item->id,
                    'product_variant_id' => $item->product_variant_id,
                    'sku' => $item->relationLoaded('variant') ? $item->variant?->sku : null,
                    'quantity' => $item->quantity,
                    'unit_cost' => $item->unit_cost,
                ],
            )->values()->all()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
