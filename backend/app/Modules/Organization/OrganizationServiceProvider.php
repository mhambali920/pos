<?php

declare(strict_types=1);

namespace App\Modules\Organization;

use App\Modules\Organization\Models\Organization;
use App\Modules\Organization\Policies\OrganizationPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class OrganizationServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
        Gate::policy(Organization::class, OrganizationPolicy::class);
    }
}
