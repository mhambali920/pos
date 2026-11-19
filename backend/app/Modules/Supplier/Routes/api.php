<?php

declare(strict_types=1);

use App\Modules\Supplier\Http\Controllers\SupplierController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::apiResource('suppliers', SupplierController::class)->names('api.v1.suppliers');
    });
