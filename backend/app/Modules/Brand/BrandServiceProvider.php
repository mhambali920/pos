<?php

declare(strict_types=1);

namespace App\Modules\Brand;

use App\Modules\Brand\Models\Brand;
use App\Modules\Brand\Policies\BrandPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class BrandServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
        Gate::policy(Brand::class, BrandPolicy::class);
    }
}
