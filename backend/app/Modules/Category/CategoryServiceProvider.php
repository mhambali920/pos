<?php

declare(strict_types=1);

namespace App\Modules\Category;

use App\Modules\Category\Models\Category;
use App\Modules\Category\Policies\CategoryPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class CategoryServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
        Gate::policy(Category::class, CategoryPolicy::class);
    }
}
