<?php

declare(strict_types=1);

namespace App\Modules\Promotion\Http\Requests;

use App\Models\User;
use App\Modules\Promotion\Models\Promotion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePromotionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->canAny(['products.update', 'settings.update']);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var User|null $user */
        $user = $this->user();
        $organizationId = $user instanceof User ? $user->organization_id : 0;
        $routePromo = $this->route('promotion');
        $promotionId = $routePromo instanceof Promotion ? $routePromo->id : null;

        return [
            'store_id' => [
                'nullable',
                'integer',
                Rule::exists('stores', 'id')->where('organization_id', $organizationId),
            ],
            'code' => [
                'required',
                'string',
                'max:64',
                Rule::unique('promotions', 'code')
                    ->where('organization_id', $organizationId)
                    ->ignore($promotionId),
            ],
            'name' => ['required', 'string', 'max:150'],
            'type' => ['required', Rule::in(['percentage', 'fixed_amount', 'bogo', 'buy_x_get_y', 'bundle', 'coupon', 'time_based'])],
            'priority' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'is_stackable' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'min_purchase' => ['nullable', 'numeric', 'min:0'],
            'max_discount' => ['nullable', 'numeric', 'min:0'],
            'rules' => ['required', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
