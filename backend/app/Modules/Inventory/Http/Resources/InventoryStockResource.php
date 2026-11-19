<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Http\Resources;

use App\Models\User;
use App\Modules\Inventory\Models\InventoryStock;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin InventoryStock
 */
class InventoryStockResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canViewCost = $user instanceof User && $user->can('products.view_cost');

        /** @var numeric-string $onHand */
        $onHand = bcadd($this->qty_on_hand, '0', 4);
        /** @var numeric-string $reserved */
        $reserved = bcadd($this->qty_reserved, '0', 4);
        $available = bcsub($onHand, $reserved, 4);
        /** @var numeric-string $unitCost */
        $unitCost = bcadd($this->unit_cost, '0', 2);
        $valuation = bcadd(bcmul($onHand, $unitCost, 6), '0.005', 2);

        return [
            'id' => $this->id,
            'warehouse_id' => $this->warehouse_id,
            'product_variant_id' => $this->product_variant_id,
            'batch_id' => $this->batch_id,
            'qty_on_hand' => $onHand,
            'qty_reserved' => $reserved,
            'qty_available' => $available,
            'unit_cost' => $this->when($canViewCost, $unitCost),
            'valuation' => $this->when($canViewCost, $valuation),
            'warehouse' => $this->whenLoaded('warehouse', fn (): ?array => $this->warehouse !== null ? [
                'id' => $this->warehouse->id,
                'code' => $this->warehouse->code,
                'name' => $this->warehouse->name,
            ] : null),
            'variant' => $this->whenLoaded('variant', fn (): ?array => $this->variant !== null ? [
                'id' => $this->variant->id,
                'sku' => $this->variant->sku,
                'name' => $this->variant->name,
                'min_stock' => $this->variant->min_stock,
                'reorder_point' => $this->variant->reorder_point,
            ] : null),
            'batch' => $this->whenLoaded('batch', fn (): ?array => $this->batch !== null ? [
                'id' => $this->batch->id,
                'batch_number' => $this->batch->batch_number,
                'expired_at' => $this->batch->expired_at?->toDateString(),
            ] : null),
        ];
    }
}
