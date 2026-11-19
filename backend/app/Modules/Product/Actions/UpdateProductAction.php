<?php

declare(strict_types=1);

namespace App\Modules\Product\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductPriceHistory;
use App\Modules\Product\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

final readonly class UpdateProductAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Product $product, array $data, ?int $actorId = null): Product
    {
        return DB::transaction(function () use ($product, $data, $actorId): Product {
            $oldProduct = $product->toArray();

            $productFields = array_intersect_key($data, array_flip([
                'category_id',
                'brand_id',
                'base_unit_id',
                'tax_id',
                'supplier_id',
                'name',
                'description',
                'image_path',
                'track_inventory',
                'track_batch',
                'track_serial',
                'is_active',
            ]));

            if ($productFields !== []) {
                $product->update($productFields);
            }

            $priceReason = is_string($data['price_change_reason'] ?? null)
                ? $data['price_change_reason']
                : 'Product price updated';

            if (is_array($data['variants'] ?? null)) {
                /** @var list<array<string, mixed>> $variantsInput */
                $variantsInput = $data['variants'];

                foreach ($variantsInput as $variantData) {
                    if (! isset($variantData['id'])) {
                        continue;
                    }

                    $variant = ProductVariant::query()
                        ->where('product_id', $product->id)
                        ->where('id', $variantData['id'])
                        ->first();

                    if (! $variant instanceof ProductVariant) {
                        continue;
                    }

                    $trackedPrices = ['purchase_price', 'selling_price', 'wholesale_price', 'min_selling_price'];
                    $oldPrices = [];
                    foreach ($trackedPrices as $priceField) {
                        $oldPrices[$priceField] = $variant->getAttribute($priceField);
                    }

                    $updatable = array_intersect_key($variantData, array_flip([
                        'name',
                        'attributes',
                        'purchase_price',
                        'selling_price',
                        'wholesale_price',
                        'min_selling_price',
                        'min_stock',
                        'max_stock',
                        'reorder_point',
                        'is_active',
                    ]));

                    if ($updatable !== []) {
                        $variant->update($updatable);
                        $variant->refresh();
                    }

                    foreach ($trackedPrices as $priceField) {
                        if (! array_key_exists($priceField, $updatable)) {
                            continue;
                        }

                        $oldVal = is_scalar($oldPrices[$priceField]) ? (string) $oldPrices[$priceField] : null;
                        $newRaw = $variant->getAttribute($priceField);
                        $newVal = is_scalar($newRaw) ? (string) $newRaw : null;

                        if ($newVal !== null && is_numeric($newVal) && ($oldVal === null || ! is_numeric($oldVal) || bccomp($oldVal, $newVal, 2) !== 0)) {
                            ProductPriceHistory::query()->create([
                                'organization_id' => $product->organization_id,
                                'store_id' => null,
                                'product_variant_id' => $variant->id,
                                'price_type' => $priceField,
                                'old_price' => $oldVal,
                                'new_price' => $newVal,
                                'reason' => $priceReason,
                                'changed_by' => $actorId,
                            ]);

                            $this->auditLogger->log(
                                module: 'Product',
                                action: 'product.price_changed',
                                entityType: ProductVariant::class,
                                entityId: $variant->id,
                                oldValues: [$priceField => $oldVal],
                                newValues: [$priceField => $newVal, 'reason' => $priceReason],
                                organizationId: $product->organization_id,
                                userId: $actorId,
                            );
                        }
                    }
                }
            }

            $product->refresh();

            $this->auditLogger->log(
                module: 'Product',
                action: 'product.updated',
                entityType: Product::class,
                entityId: $product->id,
                oldValues: ['name' => $oldProduct['name'] ?? null, 'is_active' => $oldProduct['is_active'] ?? null],
                newValues: ['name' => $product->name, 'is_active' => $product->is_active],
                organizationId: $product->organization_id,
                userId: $actorId,
            );

            return $product->load([
                'category',
                'brand',
                'baseUnit',
                'tax',
                'supplier',
                'variants.barcodes',
                'variants.bundleComponents.componentVariant',
            ]);
        });
    }
}
