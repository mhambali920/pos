<?php

declare(strict_types=1);

namespace App\Modules\AuditLog;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\AuditLog\Services\AuditLogger;
use Illuminate\Support\ServiceProvider;

class AuditLogServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AuditLoggerContract::class, AuditLogger::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
    }
}
