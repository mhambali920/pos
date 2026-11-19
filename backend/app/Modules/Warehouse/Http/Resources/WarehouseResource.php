<?php

declare(strict_types=1);

namespace App\Modules\Warehouse\Http\Resources;

use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Warehouse
 */
class WarehouseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'store_id' => $this->store_id,
            'code' => $this->code,
            'name' => $this->name,
            'address' => $this->address,
            'is_default' => $this->is_default,
            'status' => $this->status,
            'store' => $this->whenLoaded('store', fn (): ?array => $this->store !== null ? [
                'id' => $this->store->id,
                'code' => $this->store->code,
                'name' => $this->store->name,
            ] : null),
        ];
    }
}
