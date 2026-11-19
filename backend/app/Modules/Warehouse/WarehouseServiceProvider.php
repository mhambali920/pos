<?php

declare(strict_types=1);

namespace App\Modules\Warehouse;

use App\Modules\Warehouse\Models\Warehouse;
use App\Modules\Warehouse\Policies\WarehousePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class WarehouseServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
        Gate::policy(Warehouse::class, WarehousePolicy::class);
    }
}
