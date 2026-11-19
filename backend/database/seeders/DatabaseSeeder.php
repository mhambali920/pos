<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Customer\Models\Customer;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Organization\Models\Organization;
use App\Modules\Store\Models\Store;
use App\Modules\Tax\Models\Tax;
use App\Modules\Unit\Models\Unit;
use App\Modules\Warehouse\Models\Warehouse;
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

        Warehouse::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'code' => 'WH-001'],
            [
                'store_id' => $store->id,
                'name' => 'Main Store Warehouse',
                'address' => 'Jl. Sudirman No. 1, Jakarta',
                'is_default' => true,
                'status' => 'active',
            ],
        );

        $defaultUnits = [
            ['code' => 'PCS', 'name' => 'Pieces', 'allow_decimal' => false],
            ['code' => 'BOX', 'name' => 'Box', 'allow_decimal' => false],
            ['code' => 'PACK', 'name' => 'Pack', 'allow_decimal' => false],
            ['code' => 'KG', 'name' => 'Kilogram', 'allow_decimal' => true],
            ['code' => 'GR', 'name' => 'Gram', 'allow_decimal' => true],
            ['code' => 'L', 'name' => 'Liter', 'allow_decimal' => true],
            ['code' => 'M', 'name' => 'Meter', 'allow_decimal' => true],
        ];

        foreach ($defaultUnits as $unit) {
            Unit::query()->firstOrCreate(
                ['organization_id' => $organization->id, 'code' => $unit['code']],
                ['name' => $unit['name'], 'allow_decimal' => $unit['allow_decimal']],
            );
        }

        Tax::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'code' => 'PPN11'],
            [
                'name' => 'PPN 11%',
                'rate' => '11.0000',
                'type' => 'exclusive',
                'is_active' => true,
            ],
        );

        Customer::query()->firstOrCreate(
            ['organization_id' => $organization->id, 'code' => 'CUST-WALKIN'],
            [
                'name' => 'Walk-in Customer',
                'customer_type' => 'walk_in',
                'is_active' => true,
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
