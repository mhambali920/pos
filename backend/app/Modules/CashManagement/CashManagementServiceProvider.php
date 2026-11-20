<?php

declare(strict_types=1);

namespace App\Modules\CashManagement;

use Illuminate\Support\ServiceProvider;

class CashManagementServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
    }
}
