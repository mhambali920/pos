<?php

declare(strict_types=1);

use App\Modules\StockAdjustment\Http\Controllers\StockAdjustmentController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/inventory')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/adjustments', [StockAdjustmentController::class, 'index'])->name('api.v1.inventory.adjustments.index');
        Route::post('/adjustments', [StockAdjustmentController::class, 'store'])->name('api.v1.inventory.adjustments.store');
        Route::get('/adjustments/{adjustment}', [StockAdjustmentController::class, 'show'])->name('api.v1.inventory.adjustments.show');
        Route::post('/adjustments/{adjustment}/approve', [StockAdjustmentController::class, 'approve'])
            ->name('api.v1.inventory.adjustments.approve');
    });
