<?php

declare(strict_types=1);

namespace App\Modules\Customer\Http\Resources;

use App\Modules\Customer\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Customer
 */
class CustomerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'customer_group_id' => $this->customer_group_id,
            'code' => $this->code,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'customer_type' => $this->customer_type,
            'loyalty_points' => $this->loyalty_points,
            'credit_limit' => $this->credit_limit,
            'balance' => $this->balance,
            'is_active' => $this->is_active,
            'group' => $this->whenLoaded('group', fn (): ?array => $this->group !== null ? [
                'id' => $this->group->id,
                'code' => $this->group->code,
                'name' => $this->group->name,
                'discount_rate' => $this->group->discount_rate,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
