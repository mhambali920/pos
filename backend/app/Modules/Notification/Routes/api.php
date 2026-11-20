<?php

declare(strict_types=1);

use App\Modules\Notification\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/notifications')
    ->middleware(['api', 'auth:sanctum'])
    ->group(function (): void {
        Route::get('/', [NotificationController::class, 'index'])->name('api.v1.notifications.index');
        Route::post('/read-all', [NotificationController::class, 'markAllRead'])->name('api.v1.notifications.read_all');
        Route::post('/{notification}/read', [NotificationController::class, 'markRead'])->name('api.v1.notifications.read');
    });
