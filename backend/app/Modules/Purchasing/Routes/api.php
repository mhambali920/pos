<?php

declare(strict_types=1);

use App\Modules\Purchasing\Http\Controllers\GoodsReceiptController;
use App\Modules\Purchasing\Http\Controllers\PurchaseInvoiceController;
use App\Modules\Purchasing\Http\Controllers\PurchaseOrderController;
use App\Modules\Purchasing\Http\Controllers\PurchaseReturnController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/purchasing')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/orders', [PurchaseOrderController::class, 'index'])->name('api.v1.purchasing.orders.index');
        Route::post('/orders', [PurchaseOrderController::class, 'store'])->name('api.v1.purchasing.orders.store');
        Route::get('/orders/{order}', [PurchaseOrderController::class, 'show'])->name('api.v1.purchasing.orders.show');
        Route::post('/orders/{order}/submit', [PurchaseOrderController::class, 'submit'])->name('api.v1.purchasing.orders.submit');
        Route::post('/orders/{order}/approve', [PurchaseOrderController::class, 'approve'])->name('api.v1.purchasing.orders.approve');
        Route::post('/orders/{order}/reject', [PurchaseOrderController::class, 'reject'])->name('api.v1.purchasing.orders.reject');
        Route::post('/orders/{order}/cancel', [PurchaseOrderController::class, 'cancel'])->name('api.v1.purchasing.orders.cancel');

        Route::get('/goods-receipts', [GoodsReceiptController::class, 'index'])->name('api.v1.purchasing.goods-receipts.index');
        Route::post('/goods-receipts', [GoodsReceiptController::class, 'store'])->name('api.v1.purchasing.goods-receipts.store');
        Route::post('/goods-receipts/{receipt}/confirm', [GoodsReceiptController::class, 'confirm'])->name('api.v1.purchasing.goods-receipts.confirm');

        Route::get('/invoices', [PurchaseInvoiceController::class, 'index'])->name('api.v1.purchasing.invoices.index');
        Route::post('/invoices', [PurchaseInvoiceController::class, 'store'])->name('api.v1.purchasing.invoices.store');
        Route::post('/invoices/{invoice}/payments', [PurchaseInvoiceController::class, 'recordPayment'])->name('api.v1.purchasing.invoices.payments.store');

        Route::get('/returns', [PurchaseReturnController::class, 'index'])->name('api.v1.purchasing.returns.index');
        Route::post('/returns', [PurchaseReturnController::class, 'store'])->name('api.v1.purchasing.returns.store');
        Route::post('/returns/{return}/confirm', [PurchaseReturnController::class, 'confirm'])->name('api.v1.purchasing.returns.confirm');
    });
