<?php

declare(strict_types=1);

namespace App\Modules\IAM\Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * @var list<string>
     */
    public const array PERMISSIONS = [
        'organizations.view', 'organizations.create', 'organizations.update',
        'stores.view', 'stores.create', 'stores.update', 'stores.delete', 'stores.access_all',
        'warehouses.view', 'warehouses.create', 'warehouses.update', 'warehouses.delete',
        'users.view', 'users.create', 'users.update', 'users.delete',
        'roles.view', 'roles.create', 'roles.update',
        'products.view', 'products.create', 'products.update', 'products.delete', 'products.view_cost',
        'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.opname', 'inventory.approve',
        'purchasing.view', 'purchasing.create', 'purchasing.update', 'purchasing.approve', 'purchasing.receive',
        'customers.view', 'customers.create', 'customers.update', 'customers.delete',
        'suppliers.view', 'suppliers.create', 'suppliers.update', 'suppliers.delete',
        'pos.operate', 'pos.override_price', 'pos.override_discount', 'pos.hold',
        'sales.view', 'sales.cancel', 'sales.refund', 'sales.export',
        'cash_register.open', 'cash_register.close', 'cash_register.cash_in', 'cash_register.cash_out', 'cash_register.adjust_closed',
        'expenses.view', 'expenses.create', 'expenses.update', 'expenses.approve',
        'reports.view', 'reports.financial', 'reports.export',
        'audit_logs.view',
        'settings.view', 'settings.update',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $roleMatrix = [
            'Super Admin' => self::PERMISSIONS,
            'Owner' => array_values(array_diff(self::PERMISSIONS, ['organizations.create'])),
            'Admin' => array_values(array_diff(self::PERMISSIONS, ['organizations.create', 'cash_register.adjust_closed'])),
            'Store Manager' => [
                'stores.view', 'warehouses.view', 'users.view',
                'products.view', 'products.create', 'products.update', 'products.view_cost',
                'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.opname', 'inventory.approve',
                'purchasing.view', 'purchasing.create', 'purchasing.receive',
                'customers.view', 'customers.create', 'customers.update',
                'suppliers.view',
                'pos.operate', 'pos.override_price', 'pos.override_discount', 'pos.hold',
                'sales.view', 'sales.cancel', 'sales.refund', 'sales.export',
                'cash_register.open', 'cash_register.close', 'cash_register.cash_in', 'cash_register.cash_out',
                'expenses.view', 'expenses.create', 'expenses.approve',
                'reports.view', 'reports.export',
                'settings.view',
            ],
            'Supervisor' => [
                'stores.view', 'products.view', 'inventory.view', 'customers.view', 'customers.create',
                'pos.operate', 'pos.override_price', 'pos.override_discount', 'pos.hold',
                'sales.view', 'sales.cancel', 'sales.refund',
                'cash_register.open', 'cash_register.close', 'cash_register.cash_in', 'cash_register.cash_out',
                'reports.view',
            ],
            'Cashier' => [
                'stores.view', 'products.view', 'customers.view', 'customers.create',
                'pos.operate', 'pos.hold', 'sales.view',
                'cash_register.open', 'cash_register.close',
            ],
            'Inventory Staff' => [
                'stores.view', 'warehouses.view', 'products.view', 'products.create', 'products.update',
                'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.opname',
                'purchasing.view', 'purchasing.receive', 'reports.view',
            ],
            'Purchasing Staff' => [
                'stores.view', 'warehouses.view', 'products.view', 'products.view_cost',
                'suppliers.view', 'suppliers.create', 'suppliers.update',
                'purchasing.view', 'purchasing.create', 'purchasing.update', 'purchasing.receive',
                'inventory.view', 'reports.view',
            ],
            'Finance Staff' => [
                'stores.view', 'stores.access_all', 'products.view', 'products.view_cost',
                'suppliers.view', 'customers.view', 'purchasing.view', 'sales.view', 'sales.export',
                'cash_register.cash_in', 'cash_register.cash_out',
                'expenses.view', 'expenses.create', 'expenses.update', 'expenses.approve',
                'reports.view', 'reports.financial', 'reports.export',
            ],
            'Auditor' => [
                'organizations.view', 'stores.view', 'stores.access_all', 'warehouses.view',
                'users.view', 'roles.view', 'products.view', 'products.view_cost',
                'inventory.view', 'purchasing.view', 'suppliers.view', 'customers.view',
                'sales.view', 'expenses.view', 'reports.view', 'reports.financial', 'reports.export',
                'audit_logs.view', 'settings.view',
            ],
        ];

        foreach ($roleMatrix as $roleName => $permissions) {
            $role = Role::findOrCreate($roleName, 'web');
            $role->syncPermissions($permissions);
        }
    }
}
