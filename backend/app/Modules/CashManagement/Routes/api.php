<?php

declare(strict_types=1);

use App\Modules\CashManagement\Http\Controllers\CashRegisterController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/cash-register')
    ->middleware(['api', 'auth:sanctum', 'store.access'])
    ->group(function (): void {
        Route::get('/registers', [CashRegisterController::class, 'registers'])->name('api.v1.cash_register.registers.index');
        Route::post('/registers', [CashRegisterController::class, 'storeRegister'])->name('api.v1.cash_register.registers.store');
        Route::get('/sessions', [CashRegisterController::class, 'sessions'])->name('api.v1.cash_register.sessions.index');
        Route::get('/current', [CashRegisterController::class, 'current'])->name('api.v1.cash_register.current');
        Route::post('/open', [CashRegisterController::class, 'open'])->name('api.v1.cash_register.open');
        Route::post('/cash-in', [CashRegisterController::class, 'cashIn'])->name('api.v1.cash_register.cash_in');
        Route::post('/cash-out', [CashRegisterController::class, 'cashOut'])->name('api.v1.cash_register.cash_out');
        Route::post('/close', [CashRegisterController::class, 'close'])->name('api.v1.cash_register.close');
        Route::post('/sessions/{session}/adjust', [CashRegisterController::class, 'adjustClosed'])->name('api.v1.cash_register.sessions.adjust');
    });
