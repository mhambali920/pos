<?php

declare(strict_types=1);

use App\Modules\AuditLog\Http\Controllers\AuditLogController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('api.v1.audit-logs.index');
    });
