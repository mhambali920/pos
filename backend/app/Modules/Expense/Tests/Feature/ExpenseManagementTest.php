<?php

declare(strict_types=1);

namespace App\Modules\Expense\Tests\Feature;

use App\Models\User;
use App\Modules\CashManagement\Models\CashRegister;
use App\Modules\Expense\Models\ExpenseCategory;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Organization\Models\Organization;
use App\Modules\Store\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExpenseManagementTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    private Store $store;

    private ExpenseCategory $category;

    private CashRegister $register;

    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->org = Organization::query()->create(['code' => 'ORG-EXP', 'name' => 'Expense Retail']);
        $this->store = Store::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'STR-EXP',
            'name' => 'Expense Store',
        ]);
        $this->category = ExpenseCategory::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'UTIL',
            'name' => 'Utilities',
            'is_active' => true,
        ]);
        $this->register = CashRegister::query()->create([
            'organization_id' => $this->org->id,
            'store_id' => $this->store->id,
            'code' => 'REG-EXP',
            'name' => 'Main Register',
            'is_active' => true,
        ]);

        $this->manager = User::factory()->create(['organization_id' => $this->org->id]);
        $this->manager->assignRole('Store Manager');
        $this->manager->stores()->attach($this->store->id, ['is_default' => true]);
    }

    public function test_expense_lifecycle_with_attachment_approval_and_cash_drawer_deduction(): void
    {
        Storage::fake('local');
        $headers = ['X-Store-Id' => (string) $this->store->id];

        // Open register with 200,000
        $openRes = $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->postJson('/api/v1/cash-register/open', [
                'cash_register_id' => $this->register->id,
                'opening_balance' => '200000.00',
            ])
            ->assertCreated();

        $sessionId = (int) $openRes->json('data.session.id');

        // Create expense with attachment linked to open cash register session
        $createRes = $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->post('/api/v1/expenses', [
                'category_id' => $this->category->id,
                'expense_date' => now()->toDateString(),
                'amount' => '45000.00',
                'description' => 'Receipt paper rolls purchase',
                'cash_register_session_id' => $sessionId,
                'attachment' => UploadedFile::fake()->create('receipt.pdf', 120, 'application/pdf'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending_approval');

        $expenseId = (int) $createRes->json('data.id');
        $attachmentPath = (string) $createRes->json('data.attachment_path');
        Storage::disk('local')->assertExists($attachmentPath);

        // Approve expense -> records cash_expense movement on session
        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->postJson("/api/v1/expenses/{$expenseId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        // Expected cash should now be 200,000 - 45,000 = 155,000
        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->getJson('/api/v1/cash-register/current')
            ->assertOk()
            ->assertJsonPath('data.summary.cash_expense', '45000.00')
            ->assertJsonPath('data.summary.expected_cash', '155000.00');

        // Create second expense and reject it
        $rejectCreateRes = $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->postJson('/api/v1/expenses', [
                'category_id' => $this->category->id,
                'expense_date' => now()->toDateString(),
                'amount' => '150000.00',
                'description' => 'Unverified personal purchase',
            ])
            ->assertCreated();

        $rejectId = (int) $rejectCreateRes->json('data.id');

        $this->actingAs($this->manager, 'sanctum')
            ->withHeaders($headers)
            ->postJson("/api/v1/expenses/{$rejectId}/reject", [
                'reason' => 'Not an operational store expense',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejection_reason', 'Not an operational store expense');
    }
}
