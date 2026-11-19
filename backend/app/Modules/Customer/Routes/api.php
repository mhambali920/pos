<?php

declare(strict_types=1);

use App\Modules\Customer\Http\Controllers\CustomerController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::apiResource('customers', CustomerController::class)->names('api.v1.customers');
    });
