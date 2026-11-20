<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Tests\Feature;

use App\Models\User;
use App\Modules\CashManagement\Models\CashRegister;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Organization\Models\Organization;
use App\Modules\Sales\Models\Sale;
use App\Modules\Store\Models\Store;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashRegisterLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    private Store $store;

    private Warehouse $warehouse;

    private CashRegister $register;

    private User $manager;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->org = Organization::query()->create(['code' => 'ORG-CM', 'name' => 'Cash Mgmt Retail']);
        $this->store = Store::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'STR-CM',
            'name' => 'Main Store',
        ]);
        $this->warehouse = Warehouse::query()->create([
            'organization_id' => $this->org->id,
            'store_id' => $this->store->id,
            'code' => 'WH-CM',
            'name' => 'Main WH',
            'is_default' => true,
        ]);
        $this->register = CashRegister::query()->create([
            'organization_id' => $this->org->id,
            'store_id' => $this->store->id,
            'code' => 'REG-01',
            'name' => 'Counter 1',
            'is_active' => true,
        ]);

        $this->manager = User::factory()->create(['organization_id' => $this->org->id]);
        $this->manager->assignRole('Store Manager');
        $this->manager->stores()->attach($this->store->id, ['is_default' => true]);

        $this->owner = User::factory()->create(['organization_id' => $this->org->id]);
        $this->owner->assignRole('Owner');
        $this->owner->stores()->attach($this->store->id, ['is_default' => true]);
    }

    public function test_cs08_blocks_closing_register_with_pending_payment_and_reconciles_after_resolution(): void
    {
        $headers = ['X-Store-Id' => (string) $this->store->id];

        // 1. Open session with 500,000 opening balance
        $openRes = $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->postJson('/api/v1/cash-register/open', [
                'cash_register_id' => $this->register->id,
                'opening_balance' => '500000.00',
            ])
            ->assertCreated();

        $sessionId = (int) $openRes->json('data.session.id');

        // 2. Record Cash In (100,000) and Cash Out (40,000)
        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->postJson('/api/v1/cash-register/cash-in', [
                'amount' => '100000.00',
                'reason' => 'Additional change float',
            ])
            ->assertCreated();

        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->postJson('/api/v1/cash-register/cash-out', [
                'amount' => '40000.00',
                'reason' => 'Safe drop',
            ])
            ->assertCreated();

        // 3. Create a pending_payment sale tied to this session
        $pendingSale = Sale::query()->create([
            'organization_id' => $this->org->id,
            'store_id' => $this->store->id,
            'warehouse_id' => $this->warehouse->id,
            'cash_register_session_id' => $sessionId,
            'cashier_id' => $this->manager->id,
            'transaction_number' => 'POS-PENDING-001',
            'status' => 'pending_payment',
            'grand_total' => '50000.00',
        ]);

        // 4. CS-08: Closing register MUST fail with 422 PENDING_TRANSACTIONS_EXIST
        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->postJson('/api/v1/cash-register/close', [
                'actual_cash' => '560000.00',
            ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'PENDING_TRANSACTIONS_EXIST');

        // 5. Cancel pending sale, then close register with 555,000 actual cash (5,000 shortage)
        $pendingSale->update(['status' => 'cancelled']);

        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->postJson('/api/v1/cash-register/close', [
                'actual_cash' => '555000.00',
                'closing_notes' => 'End of shift count',
            ])
            ->assertOk()
            ->assertJsonPath('data.session.status', 'closed')
            ->assertJsonPath('data.summary.expected_cash', '560000.00')
            ->assertJsonPath('data.summary.actual_cash', '555000.00')
            ->assertJsonPath('data.summary.cash_difference', '-5000.00')
            ->assertJsonPath('data.summary.reconciliation_status', 'shortage');

        // 6. BR-012: Closed session rejects normal cash movements
        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->postJson('/api/v1/cash-register/cash-in', [
                'session_id' => $sessionId,
                'amount' => '5000.00',
                'reason' => 'Unauthorized edit',
            ])
            ->assertStatus(422);

        // 7. BR-012: Owner with cash_register.adjust_closed can record post-close adjustment
        $this->actingAs($this->owner, 'sanctum')
            ->withHeaders($headers)
            ->postJson("/api/v1/cash-register/sessions/{$sessionId}/adjust", [
                'amount' => '-5000.00',
                'reason' => 'Confirmed petty cash receipt found',
            ])
            ->assertOk()
            ->assertJsonPath('data.summary.expected_cash', '555000.00')
            ->assertJsonPath('data.summary.cash_difference', '0.00')
            ->assertJsonPath('data.summary.reconciliation_status', 'balanced');
    }
}
