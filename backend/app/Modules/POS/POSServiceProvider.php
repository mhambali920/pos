<?php

declare(strict_types=1);

namespace App\Modules\POS;

use Illuminate\Support\ServiceProvider;

class POSServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
    }
}
