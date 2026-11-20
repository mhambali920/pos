<?php

declare(strict_types=1);

namespace App\Modules\FinancialReporting\Tests\Feature;

use App\Models\User;
use App\Modules\Customer\Models\Customer;
use App\Modules\Expense\Models\Expense;
use App\Modules\Expense\Models\ExpenseCategory;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Organization\Models\Organization;
use App\Modules\Payment\Models\PaymentMethod;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductVariant;
use App\Modules\Store\Models\Store;
use App\Modules\Unit\Models\Unit;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class DashboardReportingLoyaltyAndNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    private Store $store;

    private Warehouse $warehouse;

    private ProductVariant $variant;

    private PaymentMethod $cashMethod;

    private Customer $member;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->org = Organization::query()->create(['code' => 'ORG-RPT', 'name' => 'Report Retail']);
        $this->store = Store::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'STR-RPT',
            'name' => 'Report Store',
        ]);
        $this->warehouse = Warehouse::query()->create([
            'organization_id' => $this->org->id,
            'store_id' => $this->store->id,
            'code' => 'WH-RPT',
            'name' => 'Report WH',
            'is_default' => true,
        ]);

        $unit = Unit::query()->create(['organization_id' => $this->org->id, 'code' => 'PCS', 'name' => 'Pieces']);
        $product = Product::query()->create([
            'organization_id' => $this->org->id,
            'base_unit_id' => $unit->id,
            'product_type' => 'standard',
            'name' => 'Espresso Beans 1kg',
            'track_inventory' => true,
        ]);
        $this->variant = ProductVariant::query()->create([
            'product_id' => $product->id,
            'sku' => 'COF-001',
            'name' => 'Espresso Beans 1kg',
            'purchase_price' => '120000.00',
            'selling_price' => '200000.00',
            'min_selling_price' => '150000.00',
            'average_cost' => '120000.00',
        ]);

        $this->cashMethod = PaymentMethod::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'CASH',
            'name' => 'Cash',
            'type' => 'cash',
        ]);

        $this->member = Customer::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'MEM-001',
            'name' => 'Ayu Member',
            'customer_type' => 'member',
            'loyalty_points' => 0,
            'is_active' => true,
        ]);

        $this->owner = User::factory()->create(['organization_id' => $this->org->id]);
        $this->owner->assignRole('Owner');
        $this->owner->stores()->attach($this->store->id, ['is_default' => true]);

        /** @var InventoryLedgerContract $ledger */
        $ledger = app(InventoryLedgerContract::class);
        $ledger->mutate(new StockMutationData(
            organizationId: $this->org->id,
            warehouseId: $this->warehouse->id,
            productVariantId: $this->variant->id,
            movementType: StockMovementType::AdjustmentIn,
            qtyChange: '20.0000',
            referenceType: 'seed',
            referenceId: 1,
            unitCost: '120000.00',
            actorId: $this->owner->id,
        ));
    }

    public function test_loyalty_dashboards_financial_report_async_export_and_notifications(): void
    {
        Storage::fake('local');
        $headers = ['X-Store-Id' => (string) $this->store->id];

        // 1. Complete a POS sale of 2x 200,000 = 400,000 (COGS = 240,000) for Ayu Member
        $txRes = $this->actingAs($this->owner, 'sanctum')
            ->withHeaders(array_merge($headers, ['Idempotency-Key' => (string) Str::uuid()]))
            ->postJson('/api/v1/pos/transactions', [
                'customer_id' => $this->member->id,
                'items' => [
                    ['product_variant_id' => $this->variant->id, 'quantity' => 2],
                ],
            ])
            ->assertCreated();

        $saleId = (int) $txRes->json('data.id');

        $this->actingAs($this->owner, 'sanctum')
            ->withHeaders(array_merge($headers, ['Idempotency-Key' => (string) Str::uuid()]))
            ->postJson("/api/v1/pos/transactions/{$saleId}/payments", [
                'payments' => [
                    [
                        'payment_method_id' => $this->cashMethod->id,
                        'amount' => '400000.00',
                        'tendered_amount' => '400000.00',
                    ],
                ],
            ])
            ->assertCreated();

        $this->actingAs($this->owner, 'sanctum')
            ->withHeaders(array_merge($headers, ['Idempotency-Key' => (string) Str::uuid()]))
            ->postJson("/api/v1/pos/transactions/{$saleId}/complete")
            ->assertOk();

        // 2. Verify member automatically earned 40 loyalty points (400,000 / 10,000)
        $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/v1/customers/{$this->member->id}/loyalty")
            ->assertOk()
            ->assertJsonPath('data.loyalty_points', 40);

        // Redeem 15 points -> balance 25
        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/v1/customers/{$this->member->id}/loyalty/adjust", [
                'type' => 'redeem',
                'points' => 15,
                'notes' => 'Member voucher redemption',
            ])
            ->assertCreated()
            ->assertJsonPath('data.balance_after', 25);

        // 3. Add approved operating expense of 50,000
        $cat = ExpenseCategory::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'UTIL',
            'name' => 'Utilities',
        ]);
        Expense::query()->create([
            'organization_id' => $this->org->id,
            'store_id' => $this->store->id,
            'category_id' => $cat->id,
            'expense_number' => 'EXP-TEST-01',
            'expense_date' => now()->toDateString(),
            'amount' => '50000.00',
            'description' => 'Electricity bill',
            'status' => 'approved',
            'created_by' => $this->owner->id,
            'approved_by' => $this->owner->id,
            'approved_at' => now(),
        ]);

        // 4. Verify Owner Dashboard KPIs (Gross Sales 400k, COGS 240k, Gross Profit 160k, Expenses 50k, Net Profit 110k)
        $this->actingAs($this->owner, 'sanctum')
            ->withHeaders($headers)
            ->getJson('/api/v1/dashboard/owner')
            ->assertOk()
            ->assertJsonPath('data.kpis.gross_sales', '400000.00')
            ->assertJsonPath('data.kpis.cogs', '240000.00')
            ->assertJsonPath('data.kpis.gross_profit', '160000.00')
            ->assertJsonPath('data.kpis.total_expenses', '50000.00')
            ->assertJsonPath('data.kpis.net_profit', '110000.00');

        // 5. Verify Financial P&L Report
        $this->actingAs($this->owner, 'sanctum')
            ->withHeaders($headers)
            ->getJson('/api/v1/reports/financial')
            ->assertOk()
            ->assertJsonPath('data.summary.net_profit', '110000.00');

        // 6. Trigger Async CSV Export -> completes synchronously under sync queue & notifies user
        $exportRes = $this->actingAs($this->owner, 'sanctum')
            ->withHeaders($headers)
            ->postJson('/api/v1/reports/financial/export', [
                'format' => 'csv',
            ])
            ->assertStatus(202)
            ->assertJsonPath('data.status', 'completed');

        $filePath = (string) $exportRes->json('data.file_path');
        Storage::disk('local')->assertExists($filePath);

        // 7. Verify Notification was dispatched and can be marked read
        $notifRes = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 1);

        $notifId = (int) $notifRes->json('data.items.0.id');

        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/v1/notifications/{$notifId}/read")
            ->assertOk();

        $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 0);
    }
}
