<?php

declare(strict_types=1);

namespace App\Modules\IAM\Actions;

use App\Models\User;
use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final readonly class LoginAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @return array{user: User, token: string}
     */
    public function execute(string $email, string $password, string $deviceName = 'web'): array
    {
        $user = User::query()->where('email', $email)->first();

        if (! $user instanceof User || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Your account is inactive. Please contact an administrator.'],
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();
        $token = $user->createToken($deviceName)->plainTextToken;

        $this->auditLogger->log(
            module: 'IAM',
            action: 'auth.login',
            entityType: User::class,
            entityId: $user->id,
            newValues: ['device_name' => $deviceName],
            organizationId: $user->organization_id,
            userId: $user->id,
        );

        return [
            'user' => $user->load(['roles.permissions', 'permissions', 'stores']),
            'token' => $token,
        ];
    }
}
