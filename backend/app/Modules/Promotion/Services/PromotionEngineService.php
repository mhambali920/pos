<?php

declare(strict_types=1);

namespace App\Modules\Promotion\Services;

use App\Modules\Promotion\Models\Promotion;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

final class PromotionEngineService
{
    /**
     * Evaluate eligible promotions for a cart in priority order with stacking rules.
     *
     * @param  list<array{product_variant_id: int, quantity: numeric-string, unit_price: numeric-string}>  $items
     * @return array{
     *     subtotal: numeric-string,
     *     total_discount: numeric-string,
     *     final_subtotal: numeric-string,
     *     applied_promotions: list<array{id: int, code: string, name: string, type: string, discount_amount: numeric-string}>
     * }
     */
    public function evaluate(
        int $organizationId,
        ?int $storeId,
        array $items,
        ?string $couponCode = null,
        ?Carbon $now = null,
    ): array {
        $at = $now ?? now();
        $subtotal = '0.00';

        foreach ($items as $item) {
            $line = bcmul($item['unit_price'], $item['quantity'], 2);
            $subtotal = bcadd($subtotal, $line, 2);
        }

        $promotions = Promotion::query()
            ->where('organization_id', $organizationId)
            ->where('is_active', true)
            ->where(function ($q) use ($storeId): void {
                $q->whereNull('store_id');
                if ($storeId !== null) {
                    $q->orWhere('store_id', $storeId);
                }
            })
            ->where(function ($q) use ($at): void {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $at);
            })
            ->where(function ($q) use ($at): void {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', $at);
            })
            ->orderBy('priority')
            ->orderBy('id')
            ->get();

        $normalizedCoupon = $couponCode !== null && trim($couponCode) !== ''
            ? Str::upper(trim($couponCode))
            : null;

        $remainingSubtotal = $subtotal;
        $totalDiscount = '0.00';
        $applied = [];

        foreach ($promotions as $promo) {
            if ($promo->usage_limit !== null && $promo->usage_count >= $promo->usage_limit) {
                continue;
            }

            if (bccomp($subtotal, $promo->min_purchase, 2) < 0) {
                continue;
            }

            if ($promo->type === 'coupon') {
                if ($normalizedCoupon === null || Str::upper($promo->code) !== $normalizedCoupon) {
                    continue;
                }
            }

            $discount = $this->calculateDiscount($promo, $items, $remainingSubtotal);
            if (bccomp($discount, '0.00', 2) <= 0) {
                continue;
            }

            if ($promo->max_discount !== null && bccomp($discount, $promo->max_discount, 2) > 0) {
                $discount = $promo->max_discount;
            }

            if (bccomp($discount, $remainingSubtotal, 2) > 0) {
                $discount = $remainingSubtotal;
            }

            $totalDiscount = bcadd($totalDiscount, $discount, 2);
            $remainingSubtotal = bcsub($remainingSubtotal, $discount, 2);

            $applied[] = [
                'id' => $promo->id,
                'code' => $promo->code,
                'name' => $promo->name,
                'type' => $promo->type,
                'discount_amount' => $discount,
            ];

            if (! $promo->is_stackable) {
                break;
            }
        }

        return [
            'subtotal' => $subtotal,
            'total_discount' => $totalDiscount,
            'final_subtotal' => $remainingSubtotal,
            'applied_promotions' => $applied,
        ];
    }

    /**
     * @param  list<array{product_variant_id: int, quantity: numeric-string, unit_price: numeric-string}>  $items
     * @param  numeric-string  $remainingSubtotal
     * @return numeric-string
     */
    private function calculateDiscount(Promotion $promo, array $items, string $remainingSubtotal): string
    {
        $rules = $promo->rules;

        return match ($promo->type) {
            'percentage', 'time_based' => $this->percentageDiscount($remainingSubtotal, $rules['percentage'] ?? '0'),
            'fixed_amount' => $this->fixedDiscount($rules['amount'] ?? '0'),
            'coupon' => isset($rules['percentage'])
                ? $this->percentageDiscount($remainingSubtotal, $rules['percentage'])
                : $this->fixedDiscount($rules['amount'] ?? '0'),
            'bogo' => $this->buyXGetYDiscount($items, 1, 1, $rules['product_variant_id'] ?? null),
            'buy_x_get_y' => $this->buyXGetYDiscount(
                $items,
                is_numeric($rules['buy_qty'] ?? null) ? max(1, (int) $rules['buy_qty']) : 2,
                is_numeric($rules['get_qty'] ?? null) ? max(1, (int) $rules['get_qty']) : 1,
                $rules['product_variant_id'] ?? null,
            ),
            'bundle' => $this->bundleDiscount($items, $rules),
            default => '0.00',
        };
    }

    /**
     * @param  numeric-string  $base
     * @return numeric-string
     */
    private function percentageDiscount(string $base, mixed $rate): string
    {
        if (! is_scalar($rate) || ! is_numeric((string) $rate)) {
            return '0.00';
        }

        /** @var numeric-string $rateStr */
        $rateStr = (string) $rate;
        if (bccomp($rateStr, '0', 4) <= 0) {
            return '0.00';
        }

        return bcdiv(bcmul($base, $rateStr, 6), '100', 2);
    }

    /**
     * @return numeric-string
     */
    private function fixedDiscount(mixed $amount): string
    {
        if (! is_scalar($amount) || ! is_numeric((string) $amount)) {
            return '0.00';
        }

        /** @var numeric-string $amt */
        $amt = bcadd((string) $amount, '0', 2);

        return bccomp($amt, '0.00', 2) > 0 ? $amt : '0.00';
    }

    /**
     * @param  list<array{product_variant_id: int, quantity: numeric-string, unit_price: numeric-string}>  $items
     * @return numeric-string
     */
    private function buyXGetYDiscount(array $items, int $buyQty, int $getQty, mixed $targetVariantId): string
    {
        $groupSize = $buyQty + $getQty;
        $discount = '0.00';

        foreach ($items as $item) {
            if ($targetVariantId !== null && is_numeric($targetVariantId) && $item['product_variant_id'] !== (int) $targetVariantId) {
                continue;
            }

            $intQty = (int) floor((float) $item['quantity']);
            if ($intQty < $groupSize) {
                continue;
            }

            $freeUnits = intdiv($intQty, $groupSize) * $getQty;
            $discount = bcadd($discount, bcmul($item['unit_price'], (string) $freeUnits, 2), 2);
        }

        return $discount;
    }

    /**
     * @param  list<array{product_variant_id: int, quantity: numeric-string, unit_price: numeric-string}>  $items
     * @param  array<string, mixed>  $rules
     * @return numeric-string
     */
    private function bundleDiscount(array $items, array $rules): string
    {
        $requiredIds = is_array($rules['required_variant_ids'] ?? null) ? $rules['required_variant_ids'] : [];
        if ($requiredIds === []) {
            return '0.00';
        }

        $presentIds = array_map(static fn (array $item): int => $item['product_variant_id'], $items);
        foreach ($requiredIds as $reqId) {
            if (! is_numeric($reqId) || ! in_array((int) $reqId, $presentIds, true)) {
                return '0.00';
            }
        }

        return $this->fixedDiscount($rules['amount'] ?? '0');
    }
}
