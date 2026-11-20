<?php

declare(strict_types=1);

use App\Modules\Sales\Http\Controllers\SaleController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/sales')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/', [SaleController::class, 'index'])->name('api.v1.sales.index');
        Route::get('/{sale}', [SaleController::class, 'show'])->name('api.v1.sales.show');
        Route::get('/{sale}/receipt', [SaleController::class, 'receipt'])->name('api.v1.sales.receipt');
        Route::post('/{sale}/void', [SaleController::class, 'void'])->name('api.v1.sales.void');
    });
