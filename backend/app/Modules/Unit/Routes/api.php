<?php

declare(strict_types=1);

use App\Modules\Unit\Http\Controllers\UnitController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::apiResource('units', UnitController::class)->names('api.v1.units');
        Route::post('/units/{unit}/conversions', [UnitController::class, 'upsertConversion'])
            ->name('api.v1.units.conversions.store');
    });
