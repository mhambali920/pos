<?php

declare(strict_types=1);

use App\Modules\Warehouse\Http\Controllers\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::apiResource('warehouses', WarehouseController::class)->names('api.v1.warehouses');
    });
