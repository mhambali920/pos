<?php

declare(strict_types=1);

namespace App\Modules\IAM\Actions;

use App\Models\User;
use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use Illuminate\Support\Facades\DB;

final readonly class UpdateUserAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data): User {
            $oldValues = [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'is_active' => $user->is_active,
                'roles' => $user->getRoleNames()->values()->all(),
                'store_ids' => $user->stores()->pluck('stores.id')->all(),
            ];

            $updatable = array_filter([
                'name' => $data['name'] ?? null,
                'email' => $data['email'] ?? null,
                'phone' => array_key_exists('phone', $data) ? $data['phone'] : null,
                'is_active' => array_key_exists('is_active', $data) ? $data['is_active'] : null,
            ], static fn (mixed $v): bool => $v !== null);

            if ($updatable !== []) {
                $user->update($updatable);
            }

            if (array_key_exists('roles', $data) && is_array($data['roles'])) {
                /** @var list<string> $roles */
                $roles = $data['roles'];
                $user->syncRoles($roles);
            }

            if (array_key_exists('store_ids', $data) && is_array($data['store_ids'])) {
                /** @var list<int> $storeIds */
                $storeIds = $data['store_ids'];
                $syncPayload = [];
                foreach ($storeIds as $index => $storeId) {
                    $syncPayload[$storeId] = ['is_default' => $index === 0];
                }
                $user->stores()->sync($syncPayload);
            }

            $user->refresh()->load(['roles.permissions', 'permissions', 'stores']);

            $this->auditLogger->log(
                module: 'IAM',
                action: 'user.updated',
                entityType: User::class,
                entityId: $user->id,
                oldValues: $oldValues,
                newValues: [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'is_active' => $user->is_active,
                    'roles' => $user->getRoleNames()->values()->all(),
                    'store_ids' => $user->stores->pluck('id')->all(),
                ],
                organizationId: $user->organization_id,
            );

            return $user;
        });
    }
}
