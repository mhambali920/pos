<?php

declare(strict_types=1);

use App\Modules\AuditLog\AuditLogServiceProvider;
use App\Modules\Brand\BrandServiceProvider;
use App\Modules\Category\CategoryServiceProvider;
use App\Modules\Core\CoreServiceProvider;
use App\Modules\Customer\CustomerServiceProvider;
use App\Modules\IAM\IAMServiceProvider;
use App\Modules\Inventory\InventoryServiceProvider;
use App\Modules\Organization\OrganizationServiceProvider;
use App\Modules\Product\ProductServiceProvider;
use App\Modules\Purchasing\PurchasingServiceProvider;
use App\Modules\Settings\SettingsServiceProvider;
use App\Modules\StockAdjustment\StockAdjustmentServiceProvider;
use App\Modules\StockTransfer\StockTransferServiceProvider;
use App\Modules\Store\StoreServiceProvider;
use App\Modules\Supplier\SupplierServiceProvider;
use App\Modules\Tax\TaxServiceProvider;
use App\Modules\Unit\UnitServiceProvider;
use App\Modules\Warehouse\WarehouseServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    CoreServiceProvider::class,
    AuditLogServiceProvider::class,
    OrganizationServiceProvider::class,
    StoreServiceProvider::class,
    IAMServiceProvider::class,
    SettingsServiceProvider::class,
    CategoryServiceProvider::class,
    BrandServiceProvider::class,
    UnitServiceProvider::class,
    TaxServiceProvider::class,
    WarehouseServiceProvider::class,
    SupplierServiceProvider::class,
    CustomerServiceProvider::class,
    ProductServiceProvider::class,
    InventoryServiceProvider::class,
    StockAdjustmentServiceProvider::class,
    StockTransferServiceProvider::class,
    PurchasingServiceProvider::class,
];
