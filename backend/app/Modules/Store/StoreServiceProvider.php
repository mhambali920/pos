<?php

declare(strict_types=1);

namespace App\Modules\Store;

use App\Modules\Store\Models\Store;
use App\Modules\Store\Policies\StorePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class StoreServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
        Gate::policy(Store::class, StorePolicy::class);
    }
}
