<?php

declare(strict_types=1);

namespace App\Modules\Product\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Product\Models\ProductPriceHistory;
use App\Modules\Product\Models\ProductStorePrice;
use App\Modules\Product\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

final readonly class UpsertStorePriceAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(
        int $organizationId,
        ProductVariant $variant,
        int $storeId,
        array $data,
        ?int $actorId = null,
    ): ProductStorePrice {
        return DB::transaction(function () use ($organizationId, $variant, $storeId, $data, $actorId): ProductStorePrice {
            $existing = ProductStorePrice::query()
                ->where('store_id', $storeId)
                ->where('product_variant_id', $variant->id)
                ->where('effective_from', $data['effective_from'] ?? null)
                ->first();

            $oldPrice = $existing?->selling_price;

            $storePrice = ProductStorePrice::query()->updateOrCreate(
                [
                    'store_id' => $storeId,
                    'product_variant_id' => $variant->id,
                    'effective_from' => $data['effective_from'] ?? null,
                ],
                [
                    'selling_price' => $data['selling_price'],
                    'wholesale_price' => $data['wholesale_price'] ?? null,
                    'min_selling_price' => $data['min_selling_price'] ?? null,
                    'effective_to' => $data['effective_to'] ?? null,
                ],
            );

            $reason = is_string($data['reason'] ?? null) ? $data['reason'] : 'Store-specific price updated';

            ProductPriceHistory::query()->create([
                'organization_id' => $organizationId,
                'store_id' => $storeId,
                'product_variant_id' => $variant->id,
                'price_type' => 'store_selling_price',
                'old_price' => $oldPrice,
                'new_price' => $storePrice->selling_price,
                'reason' => $reason,
                'changed_by' => $actorId,
            ]);

            $this->auditLogger->log(
                module: 'Product',
                action: 'product.store_price_updated',
                entityType: ProductStorePrice::class,
                entityId: $storePrice->id,
                oldValues: ['selling_price' => $oldPrice],
                newValues: ['selling_price' => $storePrice->selling_price, 'store_id' => $storeId],
                organizationId: $organizationId,
                storeId: $storeId,
                userId: $actorId,
            );

            return $storePrice;
        });
    }
}
