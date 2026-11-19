<?php

declare(strict_types=1);

namespace App\Modules\Product;

use App\Modules\Product\Models\Product;
use App\Modules\Product\Policies\ProductPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class ProductServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
        Gate::policy(Product::class, ProductPolicy::class);
    }
}
