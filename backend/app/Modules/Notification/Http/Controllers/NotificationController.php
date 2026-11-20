<?php

declare(strict_types=1);

namespace App\Modules\Notification\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Notification\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        $query = AppNotification::query()
            ->where('user_id', $user->id);

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        $items = $query->orderByDesc('created_at')->orderByDesc('id')->limit(30)->get();
        $unreadCount = AppNotification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return ApiResponse::success([
            'unread_count' => $unreadCount,
            'items' => $items,
        ], 'Notifications retrieved.');
    }

    public function markRead(Request $request, AppNotification $notification): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $notification->user_id !== $user->id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return ApiResponse::success($notification->refresh(), 'Notification marked as read.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        AppNotification::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return ApiResponse::success(null, 'All notifications marked as read.');
    }
}
