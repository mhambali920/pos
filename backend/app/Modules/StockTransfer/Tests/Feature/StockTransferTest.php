<?php

declare(strict_types=1);

namespace App\Modules\StockTransfer\Tests\Feature;

use App\Models\User;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Organization\Models\Organization;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\StockTransfer\Models\StockTransfer;
use App\Modules\Unit\Models\Unit;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockTransferTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    private Warehouse $whA;

    private Warehouse $whB;

    private ProductVariant $variant1;

    private ProductVariant $variant2;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->org = Organization::query()->create(['code' => 'ORG-TRF', 'name' => 'Transfer Corp']);
        $this->whA = Warehouse::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'WH-A',
            'name' => 'Central Warehouse',
        ]);
        $this->whB = Warehouse::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'WH-B',
            'name' => 'Branch Warehouse',
        ]);

        $unit = Unit::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'PCS',
            'name' => 'Pieces',
        ]);

        $product = Product::query()->create([
            'organization_id' => $this->org->id,
            'base_unit_id' => $unit->id,
            'product_type' => 'variant',
            'name' => 'Sneakers',
        ]);

        $this->variant1 = ProductVariant::query()->create([
            'product_id' => $product->id,
            'sku' => 'SNK-40',
            'name' => 'Sneakers 40',
            'selling_price' => '500000.00',
            'average_cost' => '300000.00',
        ]);

        $this->variant2 = ProductVariant::query()->create([
            'product_id' => $product->id,
            'sku' => 'SNK-41',
            'name' => 'Sneakers 41',
            'selling_price' => '500000.00',
            'average_cost' => '300000.00',
        ]);

        $this->owner = User::query()->create([
            'organization_id' => $this->org->id,
            'name' => 'Owner Trf',
            'email' => 'owner.trf@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $this->owner->assignRole('Owner');

        /** @var InventoryLedgerContract $ledger */
        $ledger = app(InventoryLedgerContract::class);

        $ledger->mutate(new StockMutationData(
            organizationId: $this->org->id,
            warehouseId: $this->whA->id,
            productVariantId: $this->variant1->id,
            movementType: StockMovementType::PurchaseIn,
            qtyChange: '10.0000',
            referenceType: 'seed',
            referenceId: 1,
            unitCost: '300000.00',
        ));

        $ledger->mutate(new StockMutationData(
            organizationId: $this->org->id,
            warehouseId: $this->whA->id,
            productVariantId: $this->variant2->id,
            movementType: StockMovementType::PurchaseIn,
            qtyChange: '2.0000',
            referenceType: 'seed',
            referenceId: 2,
            unitCost: '300000.00',
        ));
    }

    public function test_cs07_mid_transfer_failure_rolls_back_all_items_atomically(): void
    {
        $movementCountBefore = StockMovement::query()->count();

        // Variant 1 has 10 (ok for qty 5), Variant 2 only has 2 (fails for qty 5)
        $res = $this->actingAs($this->owner)->postJson('/api/v1/inventory/transfers', [
            'from_warehouse_id' => $this->whA->id,
            'to_warehouse_id' => $this->whB->id,
            'items' => [
                ['product_variant_id' => $this->variant1->id, 'quantity' => '5.0000'],
                ['product_variant_id' => $this->variant2->id, 'quantity' => '5.0000'],
            ],
        ])->assertStatus(201);

        $transferId = (int) $res->json('data.id');

        // Ship MUST fail with 422 INSUFFICIENT_STOCK and rollback Variant 1 deduction!
        $this->actingAs($this->owner)
            ->postJson("/api/v1/inventory/transfers/{$transferId}/ship")
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'INSUFFICIENT_STOCK');

        // Variant 1 stock MUST still be 10.0000, transfer MUST still be draft, zero new movements!
        $stock1 = InventoryStock::query()
            ->where('warehouse_id', $this->whA->id)
            ->where('product_variant_id', $this->variant1->id)
            ->firstOrFail();

        $this->assertSame('10.0000', $stock1->qty_on_hand);
        $this->assertSame('draft', StockTransfer::query()->findOrFail($transferId)->status);
        $this->assertSame($movementCountBefore, StockMovement::query()->count());
    }

    public function test_transfer_ship_receive_and_cancel_in_transit_reversal(): void
    {
        $res = $this->actingAs($this->owner)->postJson('/api/v1/inventory/transfers', [
            'from_warehouse_id' => $this->whA->id,
            'to_warehouse_id' => $this->whB->id,
            'items' => [
                ['product_variant_id' => $this->variant1->id, 'quantity' => '4.0000'],
            ],
        ])->assertStatus(201);

        $transferId = (int) $res->json('data.id');

        $this->actingAs($this->owner)
            ->postJson("/api/v1/inventory/transfers/{$transferId}/ship")
            ->assertOk()
            ->assertJsonPath('data.status', 'in_transit');

        $this->actingAs($this->owner)
            ->postJson("/api/v1/inventory/transfers/{$transferId}/receive")
            ->assertOk()
            ->assertJsonPath('data.status', 'received');

        $destStock = InventoryStock::query()
            ->where('warehouse_id', $this->whB->id)
            ->where('product_variant_id', $this->variant1->id)
            ->firstOrFail();
        $this->assertSame('4.0000', $destStock->qty_on_hand);

        // Second transfer cancelled while in_transit -> stock reversed back to WH-A
        $res2 = $this->actingAs($this->owner)->postJson('/api/v1/inventory/transfers', [
            'from_warehouse_id' => $this->whA->id,
            'to_warehouse_id' => $this->whB->id,
            'items' => [
                ['product_variant_id' => $this->variant1->id, 'quantity' => '2.0000'],
            ],
        ])->assertStatus(201);

        $transfer2Id = (int) $res2->json('data.id');

        $this->actingAs($this->owner)->postJson("/api/v1/inventory/transfers/{$transfer2Id}/ship")->assertOk();
        $this->actingAs($this->owner)
            ->postJson("/api/v1/inventory/transfers/{$transfer2Id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $srcStock = InventoryStock::query()
            ->where('warehouse_id', $this->whA->id)
            ->where('product_variant_id', $this->variant1->id)
            ->firstOrFail();
        $this->assertSame('6.0000', $srcStock->qty_on_hand);
    }
}
