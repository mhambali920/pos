<?php

declare(strict_types=1);

namespace App\Modules\IAM\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\IAM\Http\Requests\SyncRolePermissionsRequest;
use App\Modules\IAM\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('roles.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $roles = Role::query()->with('permissions')->orderBy('id')->get();

        return ApiResponse::success(RoleResource::collection($roles)->resolve($request));
    }

    public function permissions(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('roles.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $permissions = Permission::query()->orderBy('name')->pluck('name')->values()->all();

        return ApiResponse::success($permissions);
    }

    public function syncPermissions(
        SyncRolePermissionsRequest $request,
        Role $role,
        AuditLoggerContract $auditLogger,
    ): JsonResponse {
        $oldPermissions = $role->permissions->pluck('name')->values()->all();
        /** @var array{permissions: list<string>} $validated */
        $validated = $request->validated();

        $role->syncPermissions($validated['permissions']);
        $role->load('permissions');

        $auditLogger->log(
            module: 'IAM',
            action: 'role.permissions_updated',
            entityType: Role::class,
            entityId: $role->id,
            oldValues: ['permissions' => $oldPermissions],
            newValues: ['permissions' => $role->permissions->pluck('name')->values()->all()],
        );

        return ApiResponse::success(new RoleResource($role), 'Role permissions updated.');
    }
}
