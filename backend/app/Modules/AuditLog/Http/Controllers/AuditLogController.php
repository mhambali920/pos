<?php

declare(strict_types=1);

namespace App\Modules\AuditLog\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\AuditLog\Http\Resources\AuditLogResource;
use App\Modules\AuditLog\Models\AuditLog;
use App\Modules\Core\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('audit_logs.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);

        $query = AuditLog::query()
            ->where('organization_id', $user->organization_id)
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($request->filled('module')) {
            $query->where('module', (string) $request->string('module'));
        }

        if ($request->filled('action')) {
            $query->where('action', (string) $request->string('action'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        $paginator = $query->paginate($perPage);

        return ApiResponse::paginated($paginator, AuditLogResource::collection($paginator));
    }
}
