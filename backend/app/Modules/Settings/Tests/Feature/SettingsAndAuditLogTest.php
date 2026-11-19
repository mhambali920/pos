<?php

declare(strict_types=1);

namespace App\Modules\Settings\Tests\Feature;

use App\Models\User;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Organization\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsAndAuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_update_settings_and_auditor_can_view_audit_logs(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $org = Organization::query()->create([
            'code' => 'ORG-SET',
            'name' => 'Settings Corp',
        ]);

        $owner = User::query()->create([
            'organization_id' => $org->id,
            'name' => 'Owner',
            'email' => 'owner.set@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $owner->assignRole('Owner');

        $auditor = User::query()->create([
            'organization_id' => $org->id,
            'name' => 'Auditor',
            'email' => 'auditor.set@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $auditor->assignRole('Auditor');

        $this->actingAs($owner)
            ->putJson('/api/v1/settings', [
                'settings' => [
                    ['group' => 'pos', 'key' => 'receipt_footer', 'value' => 'Terima kasih!'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.0.key', 'receipt_footer');

        $this->actingAs($auditor)
            ->getJson('/api/v1/audit-logs?module=Settings')
            ->assertOk()
            ->assertJsonPath('data.0.action', 'settings.updated');
    }
}
