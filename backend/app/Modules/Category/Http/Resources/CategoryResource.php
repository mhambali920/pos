<?php

declare(strict_types=1);

namespace App\Modules\Category\Http\Resources;

use App\Modules\Category\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Category
 */
class CategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'parent_id' => $this->parent_id,
            'code' => $this->code,
            'name' => $this->name,
            'slug' => $this->slug,
            'is_active' => $this->is_active,
            'parent' => $this->whenLoaded('parent', fn (): ?array => $this->parent !== null ? [
                'id' => $this->parent->id,
                'code' => $this->parent->code,
                'name' => $this->parent->name,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
