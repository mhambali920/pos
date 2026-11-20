<?php

declare(strict_types=1);

use App\Modules\Promotion\Http\Controllers\PromotionController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/promotions')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/', [PromotionController::class, 'index'])->name('api.v1.promotions.index');
        Route::post('/', [PromotionController::class, 'store'])->name('api.v1.promotions.store');
        Route::post('/evaluate', [PromotionController::class, 'evaluate'])->name('api.v1.promotions.evaluate');
        Route::put('/{promotion}', [PromotionController::class, 'update'])->name('api.v1.promotions.update');
    });
