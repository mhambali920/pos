<?php

declare(strict_types=1);

namespace App\Modules\Payment;

use App\Modules\Payment\Contracts\PaymentGatewayContract;
use App\Modules\Payment\Services\DefaultPaymentGateway;
use Illuminate\Support\ServiceProvider;

class PaymentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PaymentGatewayContract::class, DefaultPaymentGateway::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/Routes/api.php');
    }
}
