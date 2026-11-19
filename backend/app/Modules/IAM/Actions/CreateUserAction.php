<?php

declare(strict_types=1);

namespace App\Modules\IAM\Actions;

use App\Models\User;
use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use Illuminate\Support\Facades\DB;

final readonly class CreateUserAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(int $organizationId, array $data): User
    {
        return DB::transaction(function () use ($organizationId, $data): User {
            /** @var list<string> $roles */
            $roles = is_array($data['roles'] ?? null) ? $data['roles'] : [];
            /** @var list<int> $storeIds */
            $storeIds = is_array($data['store_ids'] ?? null) ? $data['store_ids'] : [];

            $user = User::query()->create([
                'organization_id' => $organizationId,
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
                'is_active' => $data['is_active'] ?? true,
            ]);

            if ($roles !== []) {
                $user->syncRoles($roles);
            }

            if ($storeIds !== []) {
                $syncPayload = [];
                foreach ($storeIds as $index => $storeId) {
                    $syncPayload[$storeId] = ['is_default' => $index === 0];
                }
                $user->stores()->sync($syncPayload);
            }

            $this->auditLogger->log(
                module: 'IAM',
                action: 'user.created',
                entityType: User::class,
                entityId: $user->id,
                newValues: [
                    'email' => $user->email,
                    'roles' => $roles,
                    'store_ids' => $storeIds,
                ],
                organizationId: $organizationId,
            );

            return $user->load(['roles.permissions', 'permissions', 'stores']);
        });
    }
}
