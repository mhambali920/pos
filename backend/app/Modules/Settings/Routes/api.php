<?php

declare(strict_types=1);

use App\Modules\Settings\Http\Controllers\SettingController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/settings', [SettingController::class, 'index'])->name('api.v1.settings.index');
        Route::put('/settings', [SettingController::class, 'update'])->name('api.v1.settings.update');
    });
