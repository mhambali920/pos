<?php

declare(strict_types=1);

namespace App\Modules\Category\Tests\Feature;

use App\Models\User;
use App\Modules\IAM\Database\Seeders\RolesAndPermissionsSeeder;
use App\Modules\Organization\Models\Organization;
use App\Modules\Store\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogAndPartnersTest extends TestCase
{
    use RefreshDatabase;

    public function test_master_data_crud_for_categories_brands_units_taxes_warehouses_suppliers_customers(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $org = Organization::query()->create(['code' => 'ORG-MD', 'name' => 'Master Data Corp']);
        $store = Store::query()->create([
            'organization_id' => $org->id,
            'code' => 'STR-MD',
            'name' => 'Main Store',
        ]);

        $owner = User::query()->create([
            'organization_id' => $org->id,
            'name' => 'Owner MD',
            'email' => 'owner.md@test.local',
            'password' => 'secret123',
            'is_active' => true,
        ]);
        $owner->assignRole('Owner');

        // Category hierarchy
        $parentCat = $this->actingAs($owner)->postJson('/api/v1/categories', [
            'code' => 'BEV',
            'name' => 'Beverages',
        ])->assertStatus(201);

        $this->actingAs($owner)->postJson('/api/v1/categories', [
            'parent_id' => $parentCat->json('data.id'),
            'code' => 'BEV-COF',
            'name' => 'Coffee',
        ])->assertStatus(201)
            ->assertJsonPath('data.parent.code', 'BEV');

        // Brand
        $this->actingAs($owner)->postJson('/api/v1/brands', [
            'code' => 'BRD-01',
            'name' => 'Arabica Prime',
        ])->assertStatus(201);

        // Units + conversion
        $pcs = $this->actingAs($owner)->postJson('/api/v1/units', [
            'code' => 'PCS',
            'name' => 'Pieces',
        ])->assertStatus(201);

        $box = $this->actingAs($owner)->postJson('/api/v1/units', [
            'code' => 'BOX',
            'name' => 'Box',
        ])->assertStatus(201);

        $this->actingAs($owner)->postJson('/api/v1/units/'.$box->json('data.id').'/conversions', [
            'to_unit_id' => $pcs->json('data.id'),
            'multiplier' => '12.0000',
        ])->assertStatus(201)
            ->assertJsonPath('data.multiplier', '12.0000');

        // Tax
        $this->actingAs($owner)->postJson('/api/v1/taxes', [
            'code' => 'PPN11',
            'name' => 'PPN 11%',
            'rate' => '11.0000',
            'type' => 'exclusive',
        ])->assertStatus(201);

        // Warehouse
        $this->actingAs($owner)->postJson('/api/v1/warehouses', [
            'store_id' => $store->id,
            'code' => 'WH-MAIN',
            'name' => 'Main Warehouse',
            'is_default' => true,
        ])->assertStatus(201);

        // Supplier
        $this->actingAs($owner)->postJson('/api/v1/suppliers', [
            'code' => 'SUP-001',
            'company_name' => 'PT Sumber Makmur',
            'contact_person' => 'Budi',
            'payment_terms_days' => 30,
        ])->assertStatus(201);

        // Customer
        $this->actingAs($owner)->postJson('/api/v1/customers', [
            'code' => 'CUST-001',
            'name' => 'Siti Aminah',
            'customer_type' => 'member',
            'credit_limit' => '1000000.00',
        ])->assertStatus(201)
            ->assertJsonPath('data.customer_type', 'member');
    }
}
