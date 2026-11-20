<?php

declare(strict_types=1);

use App\Modules\Payment\Http\Controllers\PaymentMethodController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/payment-methods', [PaymentMethodController::class, 'index'])
            ->name('api.v1.payment-methods.index');
    });
