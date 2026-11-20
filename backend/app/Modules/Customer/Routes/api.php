<?php

declare(strict_types=1);

use App\Modules\Customer\Http\Controllers\CustomerController;
use App\Modules\Customer\Http\Controllers\LoyaltyController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::apiResource('customers', CustomerController::class)->names('api.v1.customers');
        Route::get('customers/{customer}/loyalty', [LoyaltyController::class, 'index'])->name('api.v1.customers.loyalty.index');
        Route::post('customers/{customer}/loyalty/adjust', [LoyaltyController::class, 'adjust'])->name('api.v1.customers.loyalty.adjust');
    });
