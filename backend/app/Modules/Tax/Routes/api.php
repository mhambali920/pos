<?php

declare(strict_types=1);

use App\Modules\Tax\Http\Controllers\TaxController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::apiResource('taxes', TaxController::class)->names('api.v1.taxes');
    });
