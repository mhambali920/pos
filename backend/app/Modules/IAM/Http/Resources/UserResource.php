<?php

declare(strict_types=1);

namespace App\Modules\IAM\Http\Resources;

use App\Models\User;
use App\Modules\Store\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'is_active' => $this->is_active,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'roles' => $this->getRoleNames()->values()->all(),
            'permissions' => $this->getAllPermissions()->pluck('name')->values()->all(),
            'stores' => $this->whenLoaded('stores', fn (): array => $this->stores->map(
                fn (Store $store): array => [
                    'id' => $store->id,
                    'code' => $store->code,
                    'name' => $store->name,
                    'timezone' => $store->timezone,
                ],
            )->values()->all()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
