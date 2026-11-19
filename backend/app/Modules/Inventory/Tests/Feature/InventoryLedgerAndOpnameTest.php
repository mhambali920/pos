<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Tests\Feature;

use App\Models\User;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Inventory\Domain\Exceptions\InsufficientStockException;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Inventory\Models\StockBatch;
use App\Modules\Organization\Models\Organization;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\Unit\Models\Unit;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryLedgerAndOpnameTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    private Warehouse $warehouse;

    private ProductVariant $variant;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->org = Organization::query()->create(['code' => 'ORG-INV', 'name' => 'Inventory Corp']);
        $this->warehouse = Warehouse::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'WH-01',
            'name' => 'Main Warehouse',
            'is_default' => true,
        ]);

        $unit = Unit::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'PCS',
            'name' => 'Pieces',
        ]);

        $product = Product::query()->create([
            'organization_id' => $this->org->id,
            'base_unit_id' => $unit->id,
            'product_type' => 'standard',
            'name' => 'Olive Oil 500ml',
        ]);

        $this->variant = ProductVariant::query()->create([
            'product_id' => $product->id,
            'sku' => 'OIL-500',
            'name' => 'Olive Oil 500ml',
            'purchase_price' => '10000.00',
            'selling_price' => '18000.00',
            'average_cost' => '10000.00',
            'min_stock' => '5.0000',
        ]);

        $this->owner = User::query()->create([
            'organization_id' => $this->org->id,
            'name' => 'Owner Inv',
            'email' => 'owner.inv@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $this->owner->assignRole('Owner');
    }

    public function test_mac_valuation_and_cs01_last_stock_protection_and_reconciliation(): void
    {
        /** @var InventoryLedgerContract $ledger */
        $ledger = app(InventoryLedgerContract::class);

        // Purchase 10 @ 10,000
        $ledger->mutate(new StockMutationData(
            organizationId: $this->org->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: StockMovementType::PurchaseIn,
            qtyChange: '10.0000',
            referenceType: 'test_po',
            referenceId: 1,
            unitCost: '10000.00',
            actorId: $this->owner->id,
        ));

        // Purchase 10 @ 14,000 -> MAC = (100,000 + 140,000) / 20 = 12,000.00
        $ledger->mutate(new StockMutationData(
            organizationId: $this->org->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: StockMovementType::PurchaseIn,
            qtyChange: '10.0000',
            referenceType: 'test_po',
            referenceId: 2,
            unitCost: '14000.00',
            actorId: $this->owner->id,
        ));

        $this->variant->refresh();
        $this->assertSame('12000.00', $this->variant->average_cost);

        // Deduct 19 -> leaves 1 last unit
        $ledger->mutate(new StockMutationData(
            organizationId: $this->org->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: StockMovementType::SaleOut,
            qtyChange: '-19.0000',
            referenceType: 'test_sale',
            referenceId: 100,
            actorId: $this->owner->id,
        ));

        // Cashier 1 sells the last 1 unit -> succeeds
        $ledger->mutate(new StockMutationData(
            organizationId: $this->org->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: StockMovementType::SaleOut,
            qtyChange: '-1.0000',
            referenceType: 'test_sale',
            referenceId: 101,
            actorId: $this->owner->id,
        ));

        // CS-01: Cashier 2 attempts to sell the same last unit -> blocked!
        try {
            $ledger->mutate(new StockMutationData(
                organizationId: $this->org->id,
                warehouseId: $this->warehouse->id,
                productVariantId: $this->variant->id,
                movementType: StockMovementType::SaleOut,
                qtyChange: '-1.0000',
                referenceType: 'test_sale',
                referenceId: 102,
                actorId: $this->owner->id,
            ));
            $this->fail('Expected InsufficientStockException to be thrown.');
        } catch (InsufficientStockException $e) {
            $this->assertSame('0.0000', $e->availableQty);
        }

        // Reconciliation confirms 0 discrepancies
        $this->actingAs($this->owner)
            ->postJson('/api/v1/inventory/reconcile')
            ->assertOk()
            ->assertJsonPath('data.discrepancy_count', 0);
    }

    public function test_stock_adjustment_and_opname_and_expired_alerts(): void
    {
        // Create & approve adjustment IN (+15)
        $adjRes = $this->actingAs($this->owner)->postJson('/api/v1/inventory/adjustments', [
            'warehouse_id' => $this->warehouse->id,
            'reason' => 'Initial stock count',
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'direction' => 'in',
                    'quantity' => '15.0000',
                    'unit_cost' => '11000.00',
                ],
            ],
        ])->assertStatus(201);

        $adjId = (int) $adjRes->json('data.id');

        $this->actingAs($this->owner)
            ->postJson("/api/v1/inventory/adjustments/{$adjId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        // Create & finalize opname counting 12 (variance -3)
        $opnRes = $this->actingAs($this->owner)->postJson('/api/v1/inventory/opnames', [
            'warehouse_id' => $this->warehouse->id,
            'notes' => 'Monthly physical count',
            'items' => [
                [
                    'product_variant_id' => $this->variant->id,
                    'counted_qty' => '12.0000',
                ],
            ],
        ])->assertStatus(201);

        $opnId = (int) $opnRes->json('data.id');

        $this->actingAs($this->owner)
            ->postJson("/api/v1/inventory/opnames/{$opnId}/finalize")
            ->assertOk()
            ->assertJsonPath('data.status', 'finalized');

        $stock = InventoryStock::query()
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->firstOrFail();

        $this->assertSame('12.0000', $stock->qty_on_hand);

        // Expired batch alert
        StockBatch::query()->create([
            'organization_id' => $this->org->id,
            'product_variant_id' => $this->variant->id,
            'batch_number' => 'BATCH-EXP-01',
            'expired_at' => now()->addDays(5)->toDateString(),
        ]);

        $this->actingAs($this->owner)
            ->getJson('/api/v1/inventory/alerts/expired?within_days=30')
            ->assertOk()
            ->assertJsonPath('data.0.batch_number', 'BATCH-EXP-01');
    }
}
