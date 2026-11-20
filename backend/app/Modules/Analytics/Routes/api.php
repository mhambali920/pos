<?php

declare(strict_types=1);

use App\Modules\Analytics\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/dashboard')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/{role}', [DashboardController::class, 'show'])->name('api.v1.dashboard.show');
    });
