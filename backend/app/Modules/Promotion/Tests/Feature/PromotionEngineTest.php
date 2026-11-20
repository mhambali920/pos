<?php

declare(strict_types=1);

namespace App\Modules\Promotion\Tests\Feature;

use App\Models\User;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Organization\Models\Organization;
use App\Modules\Store\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PromotionEngineTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;

    private Store $store;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->org = Organization::query()->create(['code' => 'ORG-PRM', 'name' => 'Promo Retail']);
        $this->store = Store::query()->create([
            'organization_id' => $this->org->id,
            'code' => 'STR-PRM',
            'name' => 'Promo Store',
        ]);

        $this->owner = User::factory()->create(['organization_id' => $this->org->id]);
        $this->owner->assignRole('Owner');
        $this->owner->stores()->attach($this->store->id, ['is_default' => true]);
    }

    public function test_evaluates_stackable_priority_max_discount_coupon_and_bogo(): void
    {
        // Priority 10: Stackable 10% off capped at 15,000
        $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/promotions', [
                'code' => 'MEMBER10',
                'name' => 'Member 10% Off',
                'type' => 'percentage',
                'priority' => 10,
                'is_stackable' => true,
                'min_purchase' => '50000.00',
                'max_discount' => '15000.00',
                'rules' => ['percentage' => 10],
            ])
            ->assertCreated();

        // Priority 20: Non-stackable coupon 20,000 off
        $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/promotions', [
                'code' => 'SAVE20K',
                'name' => 'Coupon 20K',
                'type' => 'coupon',
                'priority' => 20,
                'is_stackable' => false,
                'rules' => ['amount' => '20000.00'],
            ])
            ->assertCreated();

        // Priority 30: Fixed 5,000 off (should NOT apply when SAVE20K non-stackable applies!)
        $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/promotions', [
                'code' => 'EXTRA5K',
                'name' => 'Extra 5K',
                'type' => 'fixed_amount',
                'priority' => 30,
                'is_stackable' => true,
                'rules' => ['amount' => '5000.00'],
            ])
            ->assertCreated();

        // Evaluate 200,000 cart with coupon SAVE20K:
        // MEMBER10 -> 10% of 200k = 20k capped at 15k (stackable)
        // SAVE20K -> 20k (non-stackable -> stops before EXTRA5K)
        // Total discount = 35,000, final_subtotal = 165,000
        $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/promotions/evaluate', [
                'store_id' => $this->store->id,
                'coupon_code' => 'save20k',
                'items' => [
                    ['product_variant_id' => 1, 'quantity' => 2, 'unit_price' => '100000.00'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.subtotal', '200000.00')
            ->assertJsonPath('data.total_discount', '35000.00')
            ->assertJsonPath('data.final_subtotal', '165000.00')
            ->assertJsonCount(2, 'data.applied_promotions');
    }
}
