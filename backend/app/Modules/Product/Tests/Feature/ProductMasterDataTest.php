<?php

declare(strict_types=1);

namespace App\Modules\Product\Tests\Feature;

use App\Models\User;
use App\Modules\AuditLog\Models\AuditLog;
use App\Modules\Category\Models\Category;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Organization\Models\Organization;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductPriceHistory;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\Product\Services\PriceResolverService;
use App\Modules\Store\Models\Store;
use App\Modules\Tax\Models\Tax;
use App\Modules\Unit\Models\Unit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductMasterDataTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    private Store $store;

    private Unit $unit;

    private Category $category;

    private Tax $tax;

    private User $owner;

    private User $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->org = Organization::query()->create(['code' => 'ORG-P', 'name' => 'Retail Corp']);
        $this->store = Store::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'STR-01',
            'name' => 'Jakarta Main',
        ]);
        $this->unit = Unit::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'PCS',
            'name' => 'Pieces',
        ]);
        $this->category = Category::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'CAT-APP',
            'name' => 'Apparel',
            'slug' => 'apparel',
        ]);
        $this->tax = Tax::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'PPN11',
            'name' => 'PPN 11%',
            'rate' => '11.0000',
            'type' => 'exclusive',
        ]);

        $this->owner = User::query()->create([
            'organization_id' => $this->org->id,
            'name' => 'Owner',
            'email' => 'owner.prod@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $this->owner->assignRole('Owner');

        $this->cashier = User::query()->create([
            'organization_id' => $this->org->id,
            'name' => 'Cashier',
            'email' => 'cashier.prod@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $this->cashier->assignRole('Cashier');
    }

    public function test_variant_product_creation_barcode_lookup_and_cost_visibility(): void
    {
        $response = $this->actingAs($this->owner)->postJson('/api/v1/products', [
            'category_id' => $this->category->id,
            'base_unit_id' => $this->unit->id,
            'tax_id' => $this->tax->id,
            'product_type' => 'variant',
            'name' => 'Basic Cotton T-Shirt',
            'variants' => [
                [
                    'sku' => 'TSHIRT-BLK-M',
                    'name' => 'Basic Cotton T-Shirt - Black / M',
                    'attributes' => ['color' => 'Black', 'size' => 'M'],
                    'purchase_price' => '45000.00',
                    'selling_price' => '99000.00',
                    'min_selling_price' => '80000.00',
                    'barcodes' => ['8991234567890', '8991234567891'],
                ],
                [
                    'sku' => 'TSHIRT-BLK-L',
                    'name' => 'Basic Cotton T-Shirt - Black / L',
                    'attributes' => ['color' => 'Black', 'size' => 'L'],
                    'purchase_price' => '45000.00',
                    'selling_price' => '99000.00',
                    'min_selling_price' => '80000.00',
                    'barcodes' => ['8991234567892'],
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.product_type', 'variant')
            ->assertJsonCount(2, 'data.variants')
            ->assertJsonPath('data.variants.0.purchase_price', '45000.00');

        // Barcode scan lookup by Cashier MUST hide purchase_price & average_cost
        $scan = $this->actingAs($this->cashier)
            ->getJson('/api/v1/products/barcode/8991234567891');

        $scan->assertOk()
            ->assertJsonPath('data.variant.sku', 'TSHIRT-BLK-M')
            ->assertJsonMissingPath('data.variant.purchase_price')
            ->assertJsonMissingPath('data.variant.average_cost');
    }

    public function test_price_update_records_history_and_store_price_resolution(): void
    {
        $createRes = $this->actingAs($this->owner)->postJson('/api/v1/products', [
            'base_unit_id' => $this->unit->id,
            'product_type' => 'standard',
            'name' => 'Mineral Water 600ml',
            'variants' => [
                [
                    'sku' => 'WTR-600',
                    'purchase_price' => '2500.00',
                    'selling_price' => '4000.00',
                    'min_selling_price' => '3500.00',
                    'barcodes' => ['8990001112223'],
                ],
            ],
        ]);

        $productId = (int) $createRes->json('data.id');
        $variantId = (int) $createRes->json('data.variants.0.id');

        // Update selling price -> must log price history + audit log
        $this->actingAs($this->owner)->putJson("/api/v1/products/{$productId}", [
            'price_change_reason' => 'Supplier price adjustment',
            'variants' => [
                ['id' => $variantId, 'selling_price' => '4500.00'],
            ],
        ])->assertOk();

        $this->assertSame(1, ProductPriceHistory::query()->where('product_variant_id', $variantId)->count());
        $this->assertSame(1, AuditLog::query()->where('action', 'product.price_changed')->count());

        // Set store-specific price
        $this->actingAs($this->owner)->postJson("/api/v1/product-variants/{$variantId}/store-prices", [
            'store_id' => $this->store->id,
            'selling_price' => '5000.00',
            'effective_from' => now()->subDay()->toIso8601String(),
            'effective_to' => now()->addDays(7)->toIso8601String(),
            'reason' => 'Airport outlet pricing',
        ])->assertStatus(201);

        $variant = ProductVariant::query()->findOrFail($variantId);
        $resolver = new PriceResolverService;

        $storeResolved = $resolver->resolve($variant, $this->store->id);
        $defaultResolved = $resolver->resolve($variant, null);

        $this->assertSame('5000.00', $storeResolved['selling_price']->toDecimal());
        $this->assertSame('store_price', $storeResolved['source']);
        $this->assertSame('4500.00', $defaultResolved['selling_price']->toDecimal());

        // Price history endpoint returns both changes
        $this->actingAs($this->owner)
            ->getJson("/api/v1/products/{$productId}/price-history")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // Soft delete archives product without hard deleting row
        $this->actingAs($this->owner)
            ->deleteJson("/api/v1/products/{$productId}")
            ->assertOk();

        $this->assertSoftDeleted(Product::class, ['id' => $productId]);
    }

    public function test_bundle_and_service_product_types(): void
    {
        $itemRes = $this->actingAs($this->owner)->postJson('/api/v1/products', [
            'base_unit_id' => $this->unit->id,
            'product_type' => 'standard',
            'name' => 'Coffee Beans 250g',
            'variants' => [['sku' => 'COF-250', 'selling_price' => '65000.00']],
        ]);
        $componentVariantId = (int) $itemRes->json('data.variants.0.id');

        $this->actingAs($this->owner)->postJson('/api/v1/products', [
            'base_unit_id' => $this->unit->id,
            'product_type' => 'bundle',
            'name' => 'Coffee Starter Pack',
            'variants' => [
                [
                    'sku' => 'BND-COF-01',
                    'selling_price' => '120000.00',
                    'bundle_components' => [
                        ['component_variant_id' => $componentVariantId, 'quantity' => '2.0000'],
                    ],
                ],
            ],
        ])->assertStatus(201)
            ->assertJsonPath('data.product_type', 'bundle')
            ->assertJsonPath('data.variants.0.bundle_components.0.component_variant_id', $componentVariantId);

        $this->actingAs($this->owner)->postJson('/api/v1/products', [
            'base_unit_id' => $this->unit->id,
            'product_type' => 'service',
            'name' => 'Gift Wrapping Service',
            'variants' => [['sku' => 'SRV-WRAP', 'selling_price' => '15000.00']],
        ])->assertStatus(201)
            ->assertJsonPath('data.track_inventory', false);
    }
}
