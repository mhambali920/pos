<?php

declare(strict_types=1);

use App\Modules\Brand\Http\Controllers\BrandController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::apiResource('brands', BrandController::class)->names('api.v1.brands');
    });
