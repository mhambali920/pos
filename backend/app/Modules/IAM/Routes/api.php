<?php

declare(strict_types=1);

use App\Modules\IAM\Http\Controllers\AuthController;
use App\Modules\IAM\Http\Controllers\RoleController;
use App\Modules\IAM\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api'])
    ->group(function (): void {
        Route::post('/auth/login', [AuthController::class, 'login'])
            ->middleware('throttle:login')
            ->name('api.v1.auth.login');

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::get('/auth/me', [AuthController::class, 'me'])->name('api.v1.auth.me');
            Route::post('/auth/refresh', [AuthController::class, 'refresh'])->name('api.v1.auth.refresh');
            Route::post('/auth/logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');

            Route::apiResource('users', UserController::class)->names('api.v1.users');
            Route::post('/users/{user}/activate', [UserController::class, 'activate'])->name('api.v1.users.activate');
            Route::post('/users/{user}/deactivate', [UserController::class, 'deactivate'])->name('api.v1.users.deactivate');
            Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('api.v1.users.reset-password');

            Route::get('/roles', [RoleController::class, 'index'])->name('api.v1.roles.index');
            Route::put('/roles/{role}/permissions', [RoleController::class, 'syncPermissions'])->name('api.v1.roles.sync-permissions');
            Route::get('/permissions', [RoleController::class, 'permissions'])->name('api.v1.permissions.index');
        });
    });
