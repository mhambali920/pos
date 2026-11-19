<?php

declare(strict_types=1);

namespace App\Modules\IAM\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\IAM\Actions\CreateUserAction;
use App\Modules\IAM\Actions\UpdateUserAction;
use App\Modules\IAM\Http\Requests\ResetPasswordRequest;
use App\Modules\IAM\Http\Requests\StoreUserRequest;
use App\Modules\IAM\Http\Requests\UpdateUserRequest;
use App\Modules\IAM\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', User::class);

        /** @var User $authUser */
        $authUser = $request->user();

        $query = User::query()
            ->with(['roles.permissions', 'permissions', 'stores'])
            ->where('organization_id', $authUser->organization_id);

        if ($request->filled('search')) {
            $search = (string) $request->string('search');
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);
        $paginator = $query->orderByDesc('id')->paginate($perPage);

        return ApiResponse::paginated($paginator, UserResource::collection($paginator));
    }

    public function store(StoreUserRequest $request, CreateUserAction $action): JsonResponse
    {
        $authUser = $request->user();
        if (! $authUser instanceof User || $authUser->organization_id === null) {
            return ApiResponse::error('Organization context required.', 'ORGANIZATION_REQUIRED', 422);
        }

        $created = $action->execute($authUser->organization_id, $request->validated());

        return ApiResponse::success(new UserResource($created), 'User created successfully.', 201);
    }

    public function show(User $user): JsonResponse
    {
        Gate::authorize('view', $user);

        return ApiResponse::success(new UserResource($user->load(['roles.permissions', 'permissions', 'stores'])));
    }

    public function update(UpdateUserRequest $request, User $user, UpdateUserAction $action): JsonResponse
    {
        Gate::authorize('update', $user);

        $updated = $action->execute($user, $request->validated());

        return ApiResponse::success(new UserResource($updated), 'User updated successfully.');
    }

    public function destroy(Request $request, User $user, AuditLoggerContract $auditLogger): JsonResponse
    {
        Gate::authorize('delete', $user);

        /** @var User $authUser */
        $authUser = $request->user();
        if ($user->id === $authUser->id) {
            return ApiResponse::error('You cannot delete your own account.', 'SELF_DELETE_FORBIDDEN', 422);
        }

        $user->tokens()->delete();
        $user->delete();

        $auditLogger->log(
            module: 'IAM',
            action: 'user.deleted',
            entityType: User::class,
            entityId: $user->id,
            organizationId: $authUser->organization_id,
        );

        return ApiResponse::success(null, 'User deleted successfully.');
    }

    public function activate(Request $request, User $user, AuditLoggerContract $auditLogger): JsonResponse
    {
        Gate::authorize('update', $user);

        /** @var User $authUser */
        $authUser = $request->user();
        $user->forceFill(['is_active' => true])->save();

        $auditLogger->log(
            module: 'IAM',
            action: 'user.activated',
            entityType: User::class,
            entityId: $user->id,
            organizationId: $authUser->organization_id,
        );

        return ApiResponse::success(
            new UserResource($user->load(['roles.permissions', 'permissions', 'stores'])),
            'User activated.',
        );
    }

    public function deactivate(Request $request, User $user, AuditLoggerContract $auditLogger): JsonResponse
    {
        Gate::authorize('update', $user);

        /** @var User $authUser */
        $authUser = $request->user();
        if ($user->id === $authUser->id) {
            return ApiResponse::error('You cannot deactivate your own account.', 'SELF_DEACTIVATE_FORBIDDEN', 422);
        }

        $user->forceFill(['is_active' => false])->save();
        $user->tokens()->delete();

        $auditLogger->log(
            module: 'IAM',
            action: 'user.deactivated',
            entityType: User::class,
            entityId: $user->id,
            organizationId: $authUser->organization_id,
        );

        return ApiResponse::success(
            new UserResource($user->load(['roles.permissions', 'permissions', 'stores'])),
            'User deactivated.',
        );
    }

    public function resetPassword(ResetPasswordRequest $request, User $user, AuditLoggerContract $auditLogger): JsonResponse
    {
        Gate::authorize('update', $user);

        /** @var User $authUser */
        $authUser = $request->user();
        /** @var array{password: string} $validated */
        $validated = $request->validated();

        $user->forceFill(['password' => $validated['password']])->save();
        $user->tokens()->delete();

        $auditLogger->log(
            module: 'IAM',
            action: 'user.password_reset',
            entityType: User::class,
            entityId: $user->id,
            organizationId: $authUser->organization_id,
        );

        return ApiResponse::success(null, 'Password reset successfully.');
    }
}
