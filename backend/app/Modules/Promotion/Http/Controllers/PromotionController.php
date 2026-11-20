<?php

declare(strict_types=1);

namespace App\Modules\Promotion\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Promotion\Http\Requests\StorePromotionRequest;
use App\Modules\Promotion\Models\Promotion;
use App\Modules\Promotion\Services\PromotionEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PromotionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        $query = Promotion::query()
            ->where('organization_id', $user->organization_id);

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $promotions = $query->orderBy('priority')->orderBy('id')->get();

        return ApiResponse::success($promotions, 'Promotions retrieved.');
    }

    public function store(StorePromotionRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();

        $promotion = Promotion::query()->create([
            'organization_id' => $user->organization_id,
            'store_id' => $validated['store_id'] ?? null,
            'code' => Str::upper(trim((string) $validated['code'])),
            'name' => trim((string) $validated['name']),
            'type' => $validated['type'],
            'priority' => $validated['priority'] ?? 100,
            'is_stackable' => (bool) ($validated['is_stackable'] ?? false),
            'starts_at' => $validated['starts_at'] ?? null,
            'ends_at' => $validated['ends_at'] ?? null,
            'usage_limit' => $validated['usage_limit'] ?? null,
            'min_purchase' => $validated['min_purchase'] ?? '0.00',
            'max_discount' => $validated['max_discount'] ?? null,
            'rules' => $validated['rules'],
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ]);

        return ApiResponse::success($promotion, 'Promotion created.', 201);
    }

    public function update(StorePromotionRequest $request, Promotion $promotion): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if ($promotion->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $validated = $request->validated();
        $validated['code'] = Str::upper(trim((string) $validated['code']));
        $promotion->update($validated);

        return ApiResponse::success($promotion->refresh(), 'Promotion updated.');
    }

    public function evaluate(Request $request, PromotionEngineService $engine): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        /** @var array{
         *     store_id?: int|null,
         *     coupon_code?: string|null,
         *     items: list<array{product_variant_id: int, quantity: numeric-string, unit_price: numeric-string}>
         * } $validated
         */
        $validated = $request->validate([
            'store_id' => ['nullable', 'integer'],
            'coupon_code' => ['nullable', 'string', 'max:64'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_variant_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $items = array_map(static function (array $item): array {
            /** @var numeric-string $qty */
            $qty = bcadd((string) $item['quantity'], '0', 4);
            /** @var numeric-string $price */
            $price = bcadd((string) $item['unit_price'], '0', 2);

            return [
                'product_variant_id' => (int) $item['product_variant_id'],
                'quantity' => $qty,
                'unit_price' => $price,
            ];
        }, $validated['items']);

        $storeId = isset($validated['store_id'])
            ? (int) $validated['store_id']
            : ($request->header('X-Store-Id') !== null ? (int) $request->header('X-Store-Id') : null);

        $result = $engine->evaluate(
            organizationId: $user->organization_id,
            storeId: $storeId,
            items: $items,
            couponCode: $validated['coupon_code'] ?? null,
        );

        return ApiResponse::success($result, 'Promotions evaluated.');
    }
}
