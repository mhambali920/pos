<?php

declare(strict_types=1);

namespace App\Modules\Unit;

use App\Modules\Unit\Models\Unit;
use App\Modules\Unit\Policies\UnitPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class UnitServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
        Gate::policy(Unit::class, UnitPolicy::class);
    }
}
