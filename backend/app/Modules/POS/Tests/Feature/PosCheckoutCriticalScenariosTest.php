<?php

declare(strict_types=1);

namespace App\Modules\POS\Tests\Feature;

use App\Models\User;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Organization\Models\Organization;
use App\Modules\Payment\Models\PaymentMethod;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\Sales\Models\Payment;
use App\Modules\Sales\Models\Sale;
use App\Modules\Sales\Models\SaleItem;
use App\Modules\Store\Models\Store;
use App\Modules\Tax\Models\Tax;
use App\Modules\Unit\Models\Unit;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PosCheckoutCriticalScenariosTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    private Store $store;

    private Warehouse $warehouse;

    private Product $product;

    private ProductVariant $variant;

    private PaymentMethod $cashMethod;

    private PaymentMethod $qrisMethod;

    private User $cashier;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->org = Organization::query()->create(['code' => 'ORG-POS', 'name' => 'POS Retail']);
        $this->store = Store::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'STR-01',
            'name' => 'Flagship Store',
            'address' => 'Jl. Sudirman 1',
            'allow_negative_stock' => false,
        ]);
        $this->warehouse = Warehouse::query()->create([
            'organization_id' => $this->org->id,
            'store_id' => $this->store->id,
            'code' => 'WH-01',
            'name' => 'Store WH',
            'is_default' => true,
        ]);

        $unit = Unit::query()->create(['organization_id' => $this->org->id, 'code' => 'PCS', 'name' => 'Pieces']);
        $tax = Tax::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'PPN10',
            'name' => 'PPN 10%',
            'rate' => '10.0000',
            'type' => 'exclusive',
        ]);

        $this->product = Product::query()->create([
            'organization_id' => $this->org->id,
            'base_unit_id' => $unit->id,
            'tax_id' => $tax->id,
            'product_type' => 'standard',
            'name' => 'Wireless Mouse',
            'track_inventory' => true,
        ]);

        $this->variant = ProductVariant::query()->create([
            'product_id' => $this->product->id,
            'sku' => 'MS-001',
            'name' => 'Wireless Mouse',
            'purchase_price' => '100000.00',
            'selling_price' => '200000.00',
            'min_selling_price' => '180000.00',
            'average_cost' => '100000.00',
        ]);

        $this->cashMethod = PaymentMethod::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'CASH',
            'name' => 'Cash',
            'type' => 'cash',
        ]);
        $this->qrisMethod = PaymentMethod::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'QRIS',
            'name' => 'QRIS',
            'type' => 'qris',
            'gateway_driver' => 'qris_sim',
        ]);

        $this->cashier = User::query()->create([
            'organization_id' => $this->org->id,
            'name' => 'Cashier One',
            'email' => 'cashier.pos@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $this->cashier->assignRole('Cashier');
        $this->cashier->stores()->attach($this->store->id, ['is_default' => true]);

        $this->owner = User::query()->create([
            'organization_id' => $this->org->id,
            'name' => 'Owner POS',
            'email' => 'owner.pos@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $this->owner->assignRole('Owner');

        /** @var InventoryLedgerContract $ledger */
        $ledger = app(InventoryLedgerContract::class);
        $ledger->mutate(new StockMutationData(
            organizationId: $this->org->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: StockMovementType::PurchaseIn,
            qtyChange: '10.0000',
            referenceType: 'seed',
            referenceId: 1,
            unitCost: '100000.00',
        ));
    }

    public function test_cs02_idempotent_checkout_cs05_split_payment_cs09_and_cs10_snapshots(): void
    {
        // Qty 2 @ 200,000 + 10% exclusive tax = 400,000 + 40,000 = 440,000
        $createKey = (string) Str::uuid();
        $createRes = $this->actingAs($this->cashier)
            ->withHeaders(['X-Store-Id' => (string) $this->store->id, 'Idempotency-Key' => $createKey])
            ->postJson('/api/v1/pos/transactions', [
                'items' => [
                    ['product_variant_id' => $this->variant->id, 'quantity' => '2.0000'],
                ],
            ])->assertStatus(201)
            ->assertJsonPath('data.grand_total', '440000.00');

        $saleId = (int) $createRes->json('data.id');

        // CS-05: Partial payment (200,000 < 440,000) MUST NOT allow completion!
        $this->actingAs($this->cashier)
            ->withHeaders(['X-Store-Id' => (string) $this->store->id, 'Idempotency-Key' => (string) Str::uuid()])
            ->postJson("/api/v1/pos/transactions/{$saleId}/payments", [
                'payments' => [
                    [
                        'payment_method_id' => $this->cashMethod->id,
                        'amount' => '200000.00',
                        'tendered_amount' => '250000.00',
                    ],
                ],
            ])->assertStatus(201);

        $this->actingAs($this->cashier)
            ->withHeaders(['X-Store-Id' => (string) $this->store->id, 'Idempotency-Key' => (string) Str::uuid()])
            ->postJson("/api/v1/pos/transactions/{$saleId}/complete")
            ->assertStatus(422);

        // Second leg of Split Payment (QRIS 240,000) -> total paid 440,000, cash change 50,000
        $this->actingAs($this->cashier)
            ->withHeaders(['X-Store-Id' => (string) $this->store->id, 'Idempotency-Key' => (string) Str::uuid()])
            ->postJson("/api/v1/pos/transactions/{$saleId}/payments", [
                'payments' => [
                    [
                        'payment_method_id' => $this->qrisMethod->id,
                        'amount' => '240000.00',
                        'external_reference' => 'QRIS-REF-001',
                    ],
                ],
            ])->assertStatus(201);

        // CS-02: Complete checkout twice with SAME Idempotency-Key -> stock deducted ONLY ONCE (10 -> 8)!
        $completeKey = (string) Str::uuid();
        $firstComplete = $this->actingAs($this->cashier)
            ->withHeaders(['X-Store-Id' => (string) $this->store->id, 'Idempotency-Key' => $completeKey])
            ->postJson("/api/v1/pos/transactions/{$saleId}/complete")
            ->assertOk()
            ->assertJsonPath('data.sale.status', 'paid')
            ->assertJsonPath('data.sale.change_amount', '50000.00')
            ->assertJsonPath('data.receipt.paper_size', '80mm');

        $secondComplete = $this->actingAs($this->cashier)
            ->withHeaders(['X-Store-Id' => (string) $this->store->id, 'Idempotency-Key' => $completeKey])
            ->postJson("/api/v1/pos/transactions/{$saleId}/complete")
            ->assertOk()
            ->assertHeader('X-Idempotency-Replayed', 'true');

        $this->assertSame($firstComplete->json('data.sale.id'), $secondComplete->json('data.sale.id'));

        $stock = InventoryStock::query()
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->firstOrFail();
        $this->assertSame('8.0000', $stock->qty_on_hand);
        $this->assertSame(2, Payment::query()->where('sale_id', $saleId)->count());

        // CS-10: Changing product master price MUST NOT alter historical sale_items snapshot!
        $this->variant->update(['selling_price' => '350000.00']);
        $historicalItem = SaleItem::query()->where('sale_id', $saleId)->firstOrFail();
        $this->assertSame('200000.00', $historicalItem->unit_price_snapshot);
        $this->assertSame('440000.00', Sale::query()->findOrFail($saleId)->grand_total);

        // CS-09: Archiving (soft-deleting) product after sale preserves historical sale_items!
        $this->actingAs($this->owner)->deleteJson("/api/v1/products/{$this->product->id}")->assertOk();
        $this->assertSoftDeleted(Product::class, ['id' => $this->product->id]);
        $this->assertDatabaseHas('sale_items', ['sale_id' => $saleId, 'sku_snapshot' => 'MS-001']);
    }

    public function test_cs03_payment_failure_does_not_deduct_stock_and_hold_resume_void(): void
    {
        $res = $this->actingAs($this->cashier)
            ->withHeaders(['X-Store-Id' => (string) $this->store->id, 'Idempotency-Key' => (string) Str::uuid()])
            ->postJson('/api/v1/pos/transactions', [
                'items' => [
                    ['product_variant_id' => $this->variant->id, 'quantity' => '1.0000'],
                ],
            ])->assertStatus(201);

        $saleId = (int) $res->json('data.id');

        // Hold & Resume
        $this->actingAs($this->cashier)
            ->withHeaders(['X-Store-Id' => (string) $this->store->id])
            ->postJson("/api/v1/pos/transactions/{$saleId}/hold")
            ->assertOk()
            ->assertJsonPath('data.status', 'held');

        $this->actingAs($this->cashier)
            ->withHeaders(['X-Store-Id' => (string) $this->store->id])
            ->postJson("/api/v1/pos/transactions/{$saleId}/resume")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_payment');

        // CS-03: Simulated payment gateway failure -> 422, stock untouched (still 10.0000)
        $this->actingAs($this->cashier)
            ->withHeaders(['X-Store-Id' => (string) $this->store->id, 'Idempotency-Key' => (string) Str::uuid()])
            ->postJson("/api/v1/pos/transactions/{$saleId}/payments", [
                'payments' => [
                    [
                        'payment_method_id' => $this->qrisMethod->id,
                        'amount' => '220000.00',
                        'metadata' => ['simulate_failure' => true],
                    ],
                ],
            ])->assertStatus(422);

        $stock = InventoryStock::query()
            ->where('warehouse_id', $this->warehouse->id)
            ->where('product_variant_id', $this->variant->id)
            ->firstOrFail();
        $this->assertSame('10.0000', $stock->qty_on_hand);

        // Authorized Void by Owner cancels transaction cleanly
        $this->actingAs($this->owner)
            ->postJson("/api/v1/sales/{$saleId}/void", ['reason' => 'Customer cancelled order'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }
}
