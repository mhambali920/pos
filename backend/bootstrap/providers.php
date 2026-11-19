<?php

declare(strict_types=1);

use App\Modules\AuditLog\AuditLogServiceProvider;
use App\Modules\Core\CoreServiceProvider;
use App\Modules\IAM\IAMServiceProvider;
use App\Modules\Organization\OrganizationServiceProvider;
use App\Modules\Settings\SettingsServiceProvider;
use App\Modules\Store\StoreServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    CoreServiceProvider::class,
    AuditLogServiceProvider::class,
    OrganizationServiceProvider::class,
    StoreServiceProvider::class,
    IAMServiceProvider::class,
    SettingsServiceProvider::class,
];
