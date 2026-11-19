<?php

declare(strict_types=1);

use App\Modules\Inventory\Http\Controllers\InventoryController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/inventory')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/', [InventoryController::class, 'index'])->name('api.v1.inventory.index');
        Route::get('/movements', [InventoryController::class, 'movements'])->name('api.v1.inventory.movements');
        Route::post('/reconcile', [InventoryController::class, 'reconcile'])->name('api.v1.inventory.reconcile');
        Route::get('/alerts/expired', [InventoryController::class, 'expiredAlerts'])->name('api.v1.inventory.alerts.expired');
        Route::get('/opnames', [InventoryController::class, 'opnames'])->name('api.v1.inventory.opnames.index');
        Route::post('/opnames', [InventoryController::class, 'createOpname'])->name('api.v1.inventory.opnames.store');
        Route::post('/opnames/{opname}/finalize', [InventoryController::class, 'finalizeOpname'])
            ->name('api.v1.inventory.opnames.finalize');
    });
