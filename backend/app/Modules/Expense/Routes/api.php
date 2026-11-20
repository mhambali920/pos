<?php

declare(strict_types=1);

use App\Modules\Expense\Http\Controllers\ExpenseController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/expenses')
    ->middleware(['api', 'auth:sanctum', 'store.access'])
    ->group(function (): void {
        Route::get('/categories', [ExpenseController::class, 'categories'])->name('api.v1.expenses.categories.index');
        Route::post('/categories', [ExpenseController::class, 'storeCategory'])->name('api.v1.expenses.categories.store');
        Route::get('/', [ExpenseController::class, 'index'])->name('api.v1.expenses.index');
        Route::post('/', [ExpenseController::class, 'store'])->name('api.v1.expenses.store');
        Route::get('/{expense}', [ExpenseController::class, 'show'])->name('api.v1.expenses.show');
        Route::post('/{expense}/approve', [ExpenseController::class, 'approve'])->name('api.v1.expenses.approve');
        Route::post('/{expense}/reject', [ExpenseController::class, 'reject'])->name('api.v1.expenses.reject');
        Route::get('/{expense}/attachment', [ExpenseController::class, 'downloadAttachment'])->name('api.v1.expenses.attachment');
    });
