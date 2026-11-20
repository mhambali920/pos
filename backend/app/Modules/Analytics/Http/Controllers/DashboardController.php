<?php

declare(strict_types=1);

namespace App\Modules\Analytics\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Analytics\Services\DashboardService;
use App\Modules\Core\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function show(Request $request, string $role, DashboardService $dashboard): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        if (! in_array($role, ['owner', 'manager', 'cashier'], true)) {
            return ApiResponse::error('Invalid dashboard role.', 'INVALID_ROLE', 422);
        }

        if ($role === 'owner' && ! $user->canAny(['reports.financial', 'reports.view'])) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        if ($role === 'manager' && ! $user->canAny(['reports.view', 'sales.view'])) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $storeId = $request->filled('store_id')
            ? $request->integer('store_id')
            : ($request->header('X-Store-Id') !== null ? (int) $request->header('X-Store-Id') : null);

        $data = $dashboard->build($user, $role, [
            'date_from' => $request->filled('date_from') ? (string) $request->string('date_from') : null,
            'date_to' => $request->filled('date_to') ? (string) $request->string('date_to') : null,
            'store_id' => $storeId,
            'cashier_id' => $request->filled('cashier_id') ? $request->integer('cashier_id') : null,
            'category_id' => $request->filled('category_id') ? $request->integer('category_id') : null,
        ]);

        return ApiResponse::success($data, 'Dashboard data retrieved.');
    }
}
