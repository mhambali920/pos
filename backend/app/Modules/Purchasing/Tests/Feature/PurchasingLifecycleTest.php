<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Tests\Feature;

use App\Models\User;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Organization\Models\Organization;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\Supplier\Models\Supplier;
use App\Modules\Unit\Models\Unit;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchasingLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_purchasing_lifecycle_po_grn_invoice_payment_return_and_reconcile(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $org = Organization::query()->create(['code' => 'ORG-PUR', 'name' => 'Purchasing Corp']);
        $wh = Warehouse::query()->create([
            'organization_id' => $org->id,
            'code' => 'WH-PUR',
            'name' => 'Main Purchasing WH',
        ]);
        $supplier = Supplier::query()->create([
            'organization_id' => $org->id,
            'code' => 'SUP-01',
            'company_name' => 'PT Distributor Utama',
            'payment_terms_days' => 30,
        ]);
        $unit = Unit::query()->create(['organization_id' => $org->id, 'code' => 'PCS', 'name' => 'Pieces']);
        $product = Product::query()->create([
            'organization_id' => $org->id,
            'base_unit_id' => $unit->id,
            'product_type' => 'standard',
            'name' => 'Headphones X1',
        ]);
        $variant = ProductVariant::query()->create([
            'product_id' => $product->id,
            'sku' => 'HDP-X1',
            'name' => 'Headphones X1',
            'purchase_price' => '100000.00',
            'selling_price' => '180000.00',
            'average_cost' => '100000.00',
        ]);

        $owner = User::query()->create([
            'organization_id' => $org->id,
            'name' => 'Owner Pur',
            'email' => 'owner.pur@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $owner->assignRole('Owner');

        // 1. Create PO: 10 units @ 100,000, discount 50,000, tax 11% -> taxable 950,000, tax 104,500, grand_total 1,054,500
        $poRes = $this->actingAs($owner)->postJson('/api/v1/purchasing/orders', [
            'supplier_id' => $supplier->id,
            'warehouse_id' => $wh->id,
            'items' => [
                [
                    'product_variant_id' => $variant->id,
                    'qty_ordered' => '10.0000',
                    'unit_price' => '100000.00',
                    'discount_amount' => '50000.00',
                    'tax_rate' => '11.0000',
                ],
            ],
        ])->assertStatus(201)
            ->assertJsonPath('data.grand_total', '1054500.00')
            ->assertJsonPath('data.status', 'draft');

        $poId = (int) $poRes->json('data.id');
        $poItemId = (int) $poRes->json('data.items.0.id');

        // 2. Submit & Approve PO
        $this->actingAs($owner)->postJson("/api/v1/purchasing/orders/{$poId}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'submitted');

        $this->actingAs($owner)->postJson("/api/v1/purchasing/orders/{$poId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        // 3. Partial Goods Receipt: 6 received, 1 damaged -> 5 good units enter stock; PO becomes partially_received
        $grn1Res = $this->actingAs($owner)->postJson('/api/v1/purchasing/goods-receipts', [
            'purchase_order_id' => $poId,
            'items' => [
                [
                    'purchase_order_item_id' => $poItemId,
                    'qty_received' => '6.0000',
                    'qty_damaged' => '1.0000',
                    'discrepancy_notes' => '1 box crushed',
                ],
            ],
        ])->assertStatus(201);

        $this->actingAs($owner)->postJson('/api/v1/purchasing/goods-receipts/'.$grn1Res->json('data.id').'/confirm')
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.purchase_order.status', 'partially_received');

        // 4. Final Goods Receipt: remaining 4 units -> PO becomes received (total good stock = 9)
        $grn2Res = $this->actingAs($owner)->postJson('/api/v1/purchasing/goods-receipts', [
            'purchase_order_id' => $poId,
            'items' => [
                [
                    'purchase_order_item_id' => $poItemId,
                    'qty_received' => '4.0000',
                    'qty_damaged' => '0.0000',
                ],
            ],
        ])->assertStatus(201);

        $this->actingAs($owner)->postJson('/api/v1/purchasing/goods-receipts/'.$grn2Res->json('data.id').'/confirm')
            ->assertOk()
            ->assertJsonPath('data.purchase_order.status', 'received');

        $stock = InventoryStock::query()
            ->where('warehouse_id', $wh->id)
            ->where('product_variant_id', $variant->id)
            ->firstOrFail();
        $this->assertSame('9.0000', $stock->qty_on_hand);

        // 5. Purchase Invoice -> increments supplier balance
        $invRes = $this->actingAs($owner)->postJson('/api/v1/purchasing/invoices', [
            'purchase_order_id' => $poId,
            'supplier_invoice_number' => 'SUP-INV-2026-001',
        ])->assertStatus(201)
            ->assertJsonPath('data.payment_status', 'unpaid');

        $invId = (int) $invRes->json('data.id');
        $this->assertSame('1054500.00', $supplier->refresh()->balance);

        // 6. Partial payment + overpayment guard + final payment
        $this->actingAs($owner)->postJson("/api/v1/purchasing/invoices/{$invId}/payments", [
            'payment_method' => 'bank_transfer',
            'amount' => '500000.00',
            'reference_no' => 'TRF-001',
        ])->assertStatus(201)
            ->assertJsonPath('data.invoice.payment_status', 'partially_paid');

        // Overpayment rejected
        $this->actingAs($owner)->postJson("/api/v1/purchasing/invoices/{$invId}/payments", [
            'payment_method' => 'cash',
            'amount' => '600000.00',
        ])->assertStatus(422);

        // Final payment
        $this->actingAs($owner)->postJson("/api/v1/purchasing/invoices/{$invId}/payments", [
            'payment_method' => 'bank_transfer',
            'amount' => '554500.00',
            'reference_no' => 'TRF-002',
        ])->assertStatus(201)
            ->assertJsonPath('data.invoice.payment_status', 'paid');

        $this->assertSame('0.00', $supplier->refresh()->balance);

        // 7. Purchase Return: return 2 units @ 100,000 -> deducts stock to 7, creates credit note
        $retRes = $this->actingAs($owner)->postJson('/api/v1/purchasing/returns', [
            'purchase_order_id' => $poId,
            'reason' => 'Defective batch',
            'items' => [
                [
                    'product_variant_id' => $variant->id,
                    'quantity' => '2.0000',
                    'unit_cost' => '100000.00',
                ],
            ],
        ])->assertStatus(201);

        $this->actingAs($owner)->postJson('/api/v1/purchasing/returns/'.$retRes->json('data.id').'/confirm')
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed');

        $this->assertSame('7.0000', $stock->refresh()->qty_on_hand);

        // 8. Inventory reconciliation confirms 0 discrepancies!
        $this->actingAs($owner)
            ->postJson('/api/v1/inventory/reconcile')
            ->assertOk()
            ->assertJsonPath('data.discrepancy_count', 0);
    }
}
