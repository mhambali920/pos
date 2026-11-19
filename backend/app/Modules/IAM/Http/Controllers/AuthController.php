<?php

declare(strict_types=1);

namespace App\Modules\IAM\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\IAM\Actions\LoginAction;
use App\Modules\IAM\Http\Requests\LoginRequest;
use App\Modules\IAM\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function login(LoginRequest $request, LoginAction $action): JsonResponse
    {
        /** @var array{email: string, password: string, device_name?: string} $validated */
        $validated = $request->validated();

        $result = $action->execute(
            email: $validated['email'],
            password: $validated['password'],
            deviceName: $validated['device_name'] ?? 'web',
        );

        return ApiResponse::success([
            'token' => $result['token'],
            'token_type' => 'Bearer',
            'user' => (new UserResource($result['user']))->resolve($request),
        ], 'Authenticated successfully.');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        $user->load(['roles.permissions', 'permissions', 'stores']);

        return ApiResponse::success(new UserResource($user));
    }

    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        $user->currentAccessToken()->delete();

        $newToken = $user->createToken('web-refresh')->plainTextToken;

        return ApiResponse::success([
            'token' => $newToken,
            'token_type' => 'Bearer',
        ], 'Token refreshed successfully.');
    }

    public function logout(Request $request, AuditLoggerContract $auditLogger): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        $user->currentAccessToken()->delete();

        $auditLogger->log(
            module: 'IAM',
            action: 'auth.logout',
            entityType: User::class,
            entityId: $user->id,
            organizationId: $user->organization_id,
            userId: $user->id,
        );

        return ApiResponse::success(null, 'Logged out successfully.');
    }
}
