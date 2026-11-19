<?php

declare(strict_types=1);

namespace App\Modules\Tax\Http\Resources;

use App\Modules\Tax\Models\Tax;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Tax
 */
class TaxResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'code' => $this->code,
            'name' => $this->name,
            'rate' => $this->rate,
            'type' => $this->type,
            'is_active' => $this->is_active,
        ];
    }
}
