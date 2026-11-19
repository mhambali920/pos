<?php

declare(strict_types=1);

namespace App\Modules\Unit\Http\Requests;

use App\Models\User;
use App\Modules\Unit\Models\Unit;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitConversionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('products.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();
        $orgId = $user instanceof User ? $user->organization_id : null;
        $unit = $this->route('unit');
        $fromUnitId = $unit instanceof Unit ? $unit->id : null;

        return [
            'to_unit_id' => [
                'required',
                'integer',
                Rule::notIn([$fromUnitId]),
                Rule::exists('units', 'id')->where('organization_id', $orgId),
            ],
            'multiplier' => ['required', 'numeric', 'gt:0'],
        ];
    }
}
