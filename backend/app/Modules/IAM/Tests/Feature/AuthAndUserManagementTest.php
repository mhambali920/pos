<?php

declare(strict_types=1);

namespace App\Modules\IAM\Tests\Feature;

use App\Models\User;
use App\Modules\AuditLog\Models\AuditLog;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Organization\Models\Organization;
use App\Modules\Store\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthAndUserManagementTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->organization = Organization::query()->create([
            'code' => 'ORG-TEST',
            'name' => 'Test Retail Corp',
        ]);

        $this->store = Store::query()->create([
            'organization_id' => $this->organization->id,
            'code' => 'STR-01',
            'name' => 'Main Outlet',
        ]);
    }

    public function test_ten_default_roles_are_seeded(): void
    {
        $this->assertSame(10, Role::query()->count());
        $this->assertDatabaseHas('roles', ['name' => 'Super Admin']);
        $this->assertDatabaseHas('roles', ['name' => 'Cashier']);
        $this->assertDatabaseHas('roles', ['name' => 'Auditor']);
    }

    public function test_user_can_login_fetch_profile_refresh_and_logout_with_audit_trail(): void
    {
        $user = User::query()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Owner User',
            'email' => 'owner@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $user->assignRole('Owner');
        $user->stores()->attach($this->store->id, ['is_default' => true]);

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@test.local',
            'password' => 'secret123',
        ]);

        $loginResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'owner@test.local')
            ->assertJsonStructure(['data' => ['token', 'token_type', 'user'], 'meta' => ['request_id']]);

        $token = (string) $loginResponse->json('data.token');

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.roles.0', 'Owner');

        $refreshResponse = $this->withToken($token)
            ->postJson('/api/v1/auth/refresh');

        $refreshResponse->assertOk()
            ->assertJsonStructure(['data' => ['token']]);

        $newToken = (string) $refreshResponse->json('data.token');

        $this->withToken($newToken)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $this->assertSame(1, AuditLog::query()->where('action', 'auth.login')->where('user_id', $user->id)->count());
        $this->assertSame(1, AuditLog::query()->where('action', 'auth.logout')->where('user_id', $user->id)->count());
    }

    public function test_inactive_user_cannot_login(): void
    {
        User::query()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Inactive Staff',
            'email' => 'inactive@test.local',
            'password' => 'secret123',
            'is_active' => false,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'inactive@test.local',
            'password' => 'secret123',
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'VALIDATION_ERROR');
    }

    public function test_admin_can_manage_users_while_cashier_is_forbidden(): void
    {
        $admin = User::query()->create([
            'organization_id' => $this->organization->id,
            'name' => 'Admin',
            'email' => 'admin@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $admin->assignRole('Admin');

        $createRes = $this->actingAs($admin)->postJson('/api/v1/users', [
            'name' => 'Cashier One',
            'email' => 'cashier1@test.local',
            'password' => 'password123',
            'roles' => ['Cashier'],
            'store_ids' => [$this->store->id],
        ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('data.roles.0', 'Cashier');

        $cashierId = (int) $createRes->json('data.id');
        $cashier = User::query()->findOrFail($cashierId);

        $this->actingAs($cashier)
            ->getJson('/api/v1/users')
            ->assertStatus(403);

        $this->actingAs($admin)
            ->postJson("/api/v1/users/{$cashierId}/deactivate")
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($admin)
            ->postJson("/api/v1/users/{$cashierId}/activate")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->actingAs($admin)
            ->postJson("/api/v1/users/{$cashierId}/reset-password", [
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ])
            ->assertOk();
    }
}
