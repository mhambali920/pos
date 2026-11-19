<?php

declare(strict_types=1);

use App\Modules\Store\Http\Controllers\StoreController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/stores/context', [StoreController::class, 'context'])
            ->middleware('store.access')
            ->name('api.v1.stores.context');

        Route::apiResource('stores', StoreController::class)->names('api.v1.stores');
    });
