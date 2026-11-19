<?php

declare(strict_types=1);

namespace App\Modules\Tax;

use App\Modules\Tax\Models\Tax;
use App\Modules\Tax\Policies\TaxPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class TaxServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
        Gate::policy(Tax::class, TaxPolicy::class);
    }
}
