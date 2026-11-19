<?php

declare(strict_types=1);

use App\Modules\Product\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/products/barcode/{code}', [ProductController::class, 'lookupByBarcode'])
            ->name('api.v1.products.barcode');
        Route::get('/products/{product}/price-history', [ProductController::class, 'priceHistory'])
            ->name('api.v1.products.price-history');
        Route::post('/product-variants/{variant}/store-prices', [ProductController::class, 'upsertStorePrice'])
            ->name('api.v1.product-variants.store-prices.store');

        Route::apiResource('products', ProductController::class)->names('api.v1.products');
    });
