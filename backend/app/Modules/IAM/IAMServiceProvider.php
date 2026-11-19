<?php

declare(strict_types=1);

namespace App\Modules\IAM;

use App\Models\User;
use App\Modules\IAM\Policies\UserPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class IAMServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
        Gate::policy(User::class, UserPolicy::class);
    }
}
