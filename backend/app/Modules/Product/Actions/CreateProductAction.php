<?php

declare(strict_types=1);

namespace App\Modules\Product\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Product\Domain\Enums\ProductType;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductBarcode;
use App\Modules\Product\Models\ProductBundle;
use App\Modules\Product\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

final readonly class CreateProductAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(int $organizationId, array $data): Product
    {
        return DB::transaction(function () use ($organizationId, $data): Product {
            $productType = ProductType::from(is_string($data['product_type'] ?? null) ? $data['product_type'] : 'standard');

            $product = Product::query()->create([
                'organization_id' => $organizationId,
                'category_id' => $data['category_id'] ?? null,
                'brand_id' => $data['brand_id'] ?? null,
                'base_unit_id' => $data['base_unit_id'],
                'tax_id' => $data['tax_id'] ?? null,
                'supplier_id' => $data['supplier_id'] ?? null,
                'product_type' => $productType,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'image_path' => $data['image_path'] ?? null,
                'track_inventory' => $data['track_inventory'] ?? $productType->tracksInventoryByDefault(),
                'track_batch' => $data['track_batch'] ?? false,
                'track_serial' => $data['track_serial'] ?? false,
                'is_active' => $data['is_active'] ?? true,
            ]);

            /** @var list<array<string, mixed>> $variantsInput */
            $variantsInput = is_array($data['variants'] ?? null) ? $data['variants'] : [];

            foreach ($variantsInput as $variantData) {
                $purchasePrice = $variantData['purchase_price'] ?? '0.00';

                $variant = ProductVariant::query()->create([
                    'product_id' => $product->id,
                    'sku' => $variantData['sku'],
                    'name' => $variantData['name'] ?? $product->name,
                    'attributes' => $variantData['attributes'] ?? null,
                    'purchase_price' => $purchasePrice,
                    'selling_price' => $variantData['selling_price'],
                    'wholesale_price' => $variantData['wholesale_price'] ?? null,
                    'min_selling_price' => $variantData['min_selling_price'] ?? '0.00',
                    'average_cost' => $purchasePrice,
                    'min_stock' => $variantData['min_stock'] ?? '0.0000',
                    'max_stock' => $variantData['max_stock'] ?? null,
                    'reorder_point' => $variantData['reorder_point'] ?? '0.0000',
                    'is_active' => $variantData['is_active'] ?? true,
                ]);

                /** @var list<string> $barcodes */
                $barcodes = is_array($variantData['barcodes'] ?? null) ? $variantData['barcodes'] : [];
                foreach ($barcodes as $index => $code) {
                    ProductBarcode::query()->create([
                        'organization_id' => $organizationId,
                        'product_variant_id' => $variant->id,
                        'barcode' => $code,
                        'is_primary' => $index === 0,
                    ]);
                }

                if ($productType === ProductType::Bundle && is_array($variantData['bundle_components'] ?? null)) {
                    /** @var list<array{component_variant_id: int, quantity: string|int|float}> $components */
                    $components = $variantData['bundle_components'];
                    foreach ($components as $component) {
                        ProductBundle::query()->create([
                            'bundle_variant_id' => $variant->id,
                            'component_variant_id' => $component['component_variant_id'],
                            'quantity' => $component['quantity'],
                        ]);
                    }
                }
            }

            $this->auditLogger->log(
                module: 'Product',
                action: 'product.created',
                entityType: Product::class,
                entityId: $product->id,
                newValues: [
                    'name' => $product->name,
                    'product_type' => $productType->value,
                    'variant_count' => count($variantsInput),
                ],
                organizationId: $organizationId,
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
