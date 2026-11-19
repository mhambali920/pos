<?php

declare(strict_types=1);

namespace App\Modules\Supplier;

use App\Modules\Supplier\Models\Supplier;
use App\Modules\Supplier\Policies\SupplierPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class SupplierServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
        Gate::policy(Supplier::class, SupplierPolicy::class);
    }
}
