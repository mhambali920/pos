<?php

declare(strict_types=1);

use App\Modules\FinancialReporting\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/reports')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/exports', [ReportController::class, 'exports'])->name('api.v1.reports.exports.index');
        Route::get('/exports/{export}/download', [ReportController::class, 'download'])->name('api.v1.reports.exports.download');
        Route::get('/{type}', [ReportController::class, 'show'])->name('api.v1.reports.show');
        Route::post('/{type}/export', [ReportController::class, 'export'])
            ->middleware('throttle:exports')
            ->name('api.v1.reports.export');
    });
