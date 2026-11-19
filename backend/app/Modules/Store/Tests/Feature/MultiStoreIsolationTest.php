<?php

declare(strict_types=1);

namespace App\Modules\Store\Tests\Feature;

use App\Models\User;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Organization\Models\Organization;
use App\Modules\Store\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MultiStoreIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_cs06_user_cannot_access_unassigned_store_context_or_details(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $org = Organization::query()->create([
            'code' => 'ORG-ISO',
            'name' => 'Isolation Retail',
        ]);

        $storeA = Store::query()->create([
            'organization_id' => $org->id,
            'code' => 'STR-A',
            'name' => 'Outlet Jakarta',
        ]);

        $storeB = Store::query()->create([
            'organization_id' => $org->id,
            'code' => 'STR-B',
            'name' => 'Outlet Bandung',
        ]);

        $cashier = User::query()->create([
            'organization_id' => $org->id,
            'name' => 'Cashier Jakarta',
            'email' => 'cashier.jkt@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $cashier->assignRole('Cashier');
        $cashier->stores()->attach($storeA->id, ['is_default' => true]);

        // Allowed: Store A
        $this->actingAs($cashier)
            ->withHeader('X-Store-Id', (string) $storeA->id)
            ->getJson('/api/v1/stores/context')
            ->assertOk()
            ->assertJsonPath('data.code', 'STR-A');

        // Forbidden (CS-06): Store B via X-Store-Id header
        $this->actingAs($cashier)
            ->withHeader('X-Store-Id', (string) $storeB->id)
            ->getJson('/api/v1/stores/context')
            ->assertStatus(403)
            ->assertJsonPath('error_code', 'STORE_FORBIDDEN');

        // Forbidden (CS-06): Store B direct show endpoint
        $this->actingAs($cashier)
            ->getJson("/api/v1/stores/{$storeB->id}")
            ->assertStatus(403);

        // Index only returns assigned store
        $this->actingAs($cashier)
            ->getJson('/api/v1/stores')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'STR-A');

        // Owner (has stores.access_all) can access Store B
        $owner = User::query()->create([
            'organization_id' => $org->id,
            'name' => 'Owner',
            'email' => 'owner.iso@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $owner->assignRole('Owner');

        $this->actingAs($owner)
            ->withHeader('X-Store-Id', (string) $storeB->id)
            ->getJson('/api/v1/stores/context')
            ->assertOk()
            ->assertJsonPath('data.code', 'STR-B');
    }
}
