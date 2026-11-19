<?php

declare(strict_types=1);

use App\Modules\Category\Http\Controllers\CategoryController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::apiResource('categories', CategoryController::class)->names('api.v1.categories');
    });
