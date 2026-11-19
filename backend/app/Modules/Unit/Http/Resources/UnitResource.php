<?php

declare(strict_types=1);

namespace App\Modules\Unit\Http\Resources;

use App\Modules\Unit\Models\Unit;
use App\Modules\Unit\Models\UnitConversion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Unit
 */
class UnitResource extends JsonResource
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
            'allow_decimal' => $this->allow_decimal,
            'conversions' => $this->whenLoaded('conversionsFrom', fn (): array => $this->conversionsFrom->map(
                fn (UnitConversion $conv): array => [
                    'id' => $conv->id,
                    'to_unit_id' => $conv->to_unit_id,
                    'to_unit_code' => $conv->relationLoaded('toUnit') ? $conv->toUnit?->code : null,
                    'multiplier' => $conv->multiplier,
                ],
            )->values()->all()),
        ];
    }
}
