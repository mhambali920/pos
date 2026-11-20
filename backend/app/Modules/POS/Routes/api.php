<?php

declare(strict_types=1);

use App\Modules\POS\Http\Controllers\PosTransactionController;
use App\Modules\Sales\Http\Controllers\SaleController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/pos')
    ->middleware(['api', 'auth:sanctum', 'store.access'])
    ->group(function (): void {
        Route::get('/transactions', [PosTransactionController::class, 'index'])->name('api.v1.pos.transactions.index');
        Route::post('/transactions', [PosTransactionController::class, 'store'])
            ->middleware('idempotent')
            ->name('api.v1.pos.transactions.store');
        Route::get('/transactions/{sale}', [PosTransactionController::class, 'show'])->name('api.v1.pos.transactions.show');
        Route::post('/transactions/{sale}/hold', [PosTransactionController::class, 'hold'])->name('api.v1.pos.transactions.hold');
        Route::post('/transactions/{sale}/resume', [PosTransactionController::class, 'resume'])->name('api.v1.pos.transactions.resume');
        Route::post('/transactions/{sale}/payments', [PosTransactionController::class, 'recordPayment'])
            ->middleware('idempotent')
            ->name('api.v1.pos.transactions.payments');
        Route::post('/transactions/{sale}/complete', [PosTransactionController::class, 'complete'])
            ->middleware('idempotent')
            ->name('api.v1.pos.transactions.complete');
        Route::post('/transactions/{sale}/refund', [SaleController::class, 'refund'])
            ->middleware('idempotent')
            ->name('api.v1.pos.transactions.refund');
        Route::get('/transactions/{sale}/receipt', [PosTransactionController::class, 'receipt'])->name('api.v1.pos.transactions.receipt');
    });
