<?php

declare(strict_types=1);

use App\Modules\Organization\Http\Controllers\OrganizationController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::apiResource('organizations', OrganizationController::class)
            ->except(['destroy'])
            ->names('api.v1.organizations');
    });
