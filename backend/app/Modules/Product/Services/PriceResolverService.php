<?php

declare(strict_types=1);

namespace App\Modules\Product\Services;

use App\Modules\Core\Domain\ValueObjects\Money;
use App\Modules\Product\Models\ProductStorePrice;
use App\Modules\Product\Models\ProductVariant;
use Carbon\CarbonInterface;

final readonly class PriceResolverService
{
    /**
     * Resolve effective selling & minimum selling price for a product variant at a given store & time.
     *
     * @return array{selling_price: Money, wholesale_price: Money|null, min_selling_price: Money, source: string}
     */
    public function resolve(
        ProductVariant $variant,
        ?int $storeId = null,
        ?CarbonInterface $at = null,
        string $currency = 'IDR',
    ): array {
        $moment = $at ?? now();

        if ($storeId !== null) {
            $storePrice = ProductStorePrice::query()
                ->where('store_id', $storeId)
                ->where('product_variant_id', $variant->id)
                ->where(function ($q) use ($moment): void {
                    $q->whereNull('effective_from')->orWhere('effective_from', '<=', $moment);
                })
                ->where(function ($q) use ($moment): void {
                    $q->whereNull('effective_to')->orWhere('effective_to', '>=', $moment);
                })
                ->orderByDesc('effective_from')
                ->orderByDesc('id')
                ->first();

            if ($storePrice instanceof ProductStorePrice) {
                return [
                    'selling_price' => Money::of($storePrice->selling_price, $currency),
                    'wholesale_price' => $storePrice->wholesale_price !== null
                        ? Money::of($storePrice->wholesale_price, $currency)
                        : ($variant->wholesale_price !== null ? Money::of($variant->wholesale_price, $currency) : null),
                    'min_selling_price' => Money::of(
                        $storePrice->min_selling_price ?? $variant->min_selling_price,
                        $currency,
                    ),
                    'source' => 'store_price',
                ];
            }
        }

        return [
            'selling_price' => Money::of($variant->selling_price, $currency),
            'wholesale_price' => $variant->wholesale_price !== null
                ? Money::of($variant->wholesale_price, $currency)
                : null,
            'min_selling_price' => Money::of($variant->min_selling_price, $currency),
            'source' => 'default_price',
        ];
    }
}
