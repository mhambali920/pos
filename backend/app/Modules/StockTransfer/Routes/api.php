<?php

declare(strict_types=1);

use App\Modules\StockTransfer\Http\Controllers\StockTransferController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/inventory')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/transfers', [StockTransferController::class, 'index'])->name('api.v1.inventory.transfers.index');
        Route::post('/transfers', [StockTransferController::class, 'store'])->name('api.v1.inventory.transfers.store');
        Route::get('/transfers/{transfer}', [StockTransferController::class, 'show'])->name('api.v1.inventory.transfers.show');
        Route::post('/transfers/{transfer}/ship', [StockTransferController::class, 'ship'])->name('api.v1.inventory.transfers.ship');
        Route::post('/transfers/{transfer}/receive', [StockTransferController::class, 'receive'])->name('api.v1.inventory.transfers.receive');
        Route::post('/transfers/{transfer}/cancel', [StockTransferController::class, 'cancel'])->name('api.v1.inventory.transfers.cancel');
    });
