<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Organization\Models\Organization;
use App\Modules\Store\Models\Store;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        $organization = Organization::query()->firstOrCreate(
            ['code' => 'ORG-DEFAULT'],
            [
                'name' => 'Enterprise POS Retail',
                'legal_name' => 'PT Enterprise POS Indonesia',
                'currency_code' => 'IDR',
                'inventory_valuation_method' => 'mac',
                'status' => 'active',
            ],
        );

        $store = Store::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'code' => 'STR-001'],
            [
                'name' => 'Flagship Store Jakarta',
                'address' => 'Jl. Sudirman No. 1, Jakarta',
                'timezone' => 'Asia/Jakarta',
                'allow_negative_stock' => false,
                'status' => 'active',
            ],
        );

        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@pos.local'],
            [
                'organization_id' => $organization->id,
                'name' => 'Super Admin',
                'password' => 'password123',
                'is_active' => true,
            ],
        );

        $admin->syncRoles(['Super Admin']);
        $admin->stores()->syncWithoutDetaching([$store->id => ['is_default' => true]]);
    }
}
