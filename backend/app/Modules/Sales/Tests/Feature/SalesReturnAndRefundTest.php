<?php

declare(strict_types=1);

namespace App\Modules\Sales\Tests\Feature;

use App\Models\User;
use App\Modules\CashManagement\Models\CashRegister;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Organization\Models\Organization;
use App\Modules\Payment\Models\PaymentMethod;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\Store\Models\Store;
use App\Modules\Unit\Models\Unit;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SalesReturnAndRefundTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    private Store $store;

    private Warehouse $warehouse;

    private ProductVariant $variant;

    private PaymentMethod $cashMethod;

    private CashRegister $register;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->org = Organization::query()->create(['code' => 'ORG-RET', 'name' => 'Return Retail']);
        $this->store = Store::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'STR-RET',
            'name' => 'Return Store',
        ]);
        $this->warehouse = Warehouse::query()->create([
            'organization_id' => $this->org->id,
            'store_id' => $this->store->id,
            'code' => 'WH-RET',
            'name' => 'Return WH',
            'is_default' => true,
        ]);

        $unit = Unit::query()->create(['organization_id' => $this->org->id, 'code' => 'PCS', 'name' => 'Pieces']);
        $product = Product::query()->create([
            'organization_id' => $this->org->id,
            'base_unit_id' => $unit->id,
            'product_type' => 'standard',
            'name' => 'Mechanical Keyboard',
            'track_inventory' => true,
        ]);
        $this->variant = ProductVariant::query()->create([
            'product_id' => $product->id,
            'sku' => 'KB-001',
            'name' => 'Mechanical Keyboard',
            'purchase_price' => '300000.00',
            'selling_price' => '500000.00',
            'min_selling_price' => '400000.00',
            'average_cost' => '300000.00',
        ]);

        $this->cashMethod = PaymentMethod::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'CASH',
            'name' => 'Cash',
            'type' => 'cash',
        ]);

        $this->register = CashRegister::query()->create([
            'organization_id' => $this->org->id,
            'store_id' => $this->store->id,
            'code' => 'REG-RET',
            'name' => 'Register 1',
            'is_active' => true,
        ]);

        $this->manager = User::factory()->create(['organization_id' => $this->org->id]);
        $this->manager->assignRole('Store Manager');
        $this->manager->stores()->attach($this->store->id, ['is_default' => true]);

        /** @var InventoryLedgerContract $ledger */
        $ledger = app(InventoryLedgerContract::class);
        $ledger->mutate(new StockMutationData(
            organizationId: $this->org->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: StockMovementType::AdjustmentIn,
            qtyChange: '10.0000',
            referenceType: 'seed',
            referenceId: 1,
            unitCost: '300000.00',
            actorId: $this->manager->id,
        ));
    }

    public function test_cs04_partial_refund_restores_resellable_stock_updates_cash_register_and_blocks_over_refund(): void
    {
        $headers = ['X-Store-Id' => (string) $this->store->id];

        // Open register with 1,000,000
        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->postJson('/api/v1/cash-register/open', [
                'cash_register_id' => $this->register->id,
                'opening_balance' => '1000000.00',
            ])
            ->assertCreated();

        // Sell 3 units at 500,000 each = 1,500,000 (stock becomes 7)
        $txRes = $this->actingAs($this->manager, 'sanctum')
            ->withHeaders(array_merge($headers, ['Idempotency-Key' => (string) Str::uuid()]))
            ->postJson('/api/v1/pos/transactions', [
                'items' => [
                    ['product_variant_id' => $this->variant->id, 'quantity' => 3],
                ],
            ])
            ->assertCreated();

        $saleId = (int) $txRes->json('data.id');
        $saleItemId = (int) $txRes->json('data.items.0.id');

        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders(array_merge($headers, ['Idempotency-Key' => (string) Str::uuid()]))
            ->postJson("/api/v1/pos/transactions/{$saleId}/payments", [
                'payments' => [
                    [
                        'payment_method_id' => $this->cashMethod->id,
                        'amount' => '1500000.00',
                        'tendered_amount' => '1500000.00',
                    ],
                ],
            ])
            ->assertCreated();

        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders(array_merge($headers, ['Idempotency-Key' => (string) Str::uuid()]))
            ->postJson("/api/v1/pos/transactions/{$saleId}/complete")
            ->assertOk();

        $stock = InventoryStock::query()->where('product_variant_id', $this->variant->id)->firstOrFail();
        $this->assertSame('7.0000', $stock->qty_on_hand);

        // Partial refund 1 resellable unit (stock -> 8, status -> partially_refunded)
        $refundKey = (string) Str::uuid();
        $refundRes = $this->actingAs($this->manager, 'sanctum')
            ->withHeaders(array_merge($headers, ['Idempotency-Key' => $refundKey]))
            ->postJson("/api/v1/sales/{$saleId}/refund", [
                'reason' => 'Customer changed mind',
                'refund_method_id' => $this->cashMethod->id,
                'items' => [
                    ['sale_item_id' => $saleItemId, 'quantity' => 1, 'condition' => 'resellable'],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.refund_amount', '500000.00');

        // Idempotent replay returns same return_number without double-restoring stock
        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders(array_merge($headers, ['Idempotency-Key' => $refundKey]))
            ->postJson("/api/v1/sales/{$saleId}/refund", [
                'reason' => 'Customer changed mind',
                'refund_method_id' => $this->cashMethod->id,
                'items' => [
                    ['sale_item_id' => $saleItemId, 'quantity' => 1, 'condition' => 'resellable'],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.return_number', $refundRes->json('data.return_number'));

        $this->assertSame('8.0000', $stock->refresh()->qty_on_hand);

        // CS-04: Attempting to refund 3 more (cumulative 4 > purchased 3) MUST fail with 422 INVALID_REFUND_QUANTITY
        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders(array_merge($headers, ['Idempotency-Key' => (string) Str::uuid()]))
            ->postJson("/api/v1/sales/{$saleId}/refund", [
                'reason' => 'Over-refund attempt',
                'refund_method_id' => $this->cashMethod->id,
                'items' => [
                    ['sale_item_id' => $saleItemId, 'quantity' => 3, 'condition' => 'resellable'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_REFUND_QUANTITY');

        // Stock unchanged after failed over-refund
        $this->assertSame('8.0000', $stock->refresh()->qty_on_hand);

        // Refund remaining 2 units as damaged (stock stays 8, sale becomes 'refunded')
        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders(array_merge($headers, ['Idempotency-Key' => (string) Str::uuid()]))
            ->postJson("/api/v1/sales/{$saleId}/refund", [
                'reason' => 'Damaged keys',
                'refund_method_id' => $this->cashMethod->id,
                'items' => [
                    ['sale_item_id' => $saleItemId, 'quantity' => 2, 'condition' => 'damaged'],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.refund_amount', '1000000.00');

        $this->assertSame('8.0000', $stock->refresh()->qty_on_hand);

        // Verify Cash Register reconciliation reflects opening (1,000,000) + cash_sales (1,500,000) - cash_refund (1,500,000) = 1,000,000
        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->getJson('/api/v1/cash-register/current')
            ->assertOk()
            ->assertJsonPath('data.summary.cash_sales', '1500000.00')
            ->assertJsonPath('data.summary.cash_refund', '1500000.00')
            ->assertJsonPath('data.summary.expected_cash', '1000000.00');
    }
}
