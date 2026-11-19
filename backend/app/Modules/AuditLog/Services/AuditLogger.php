<?php

declare(strict_types=1);

namespace App\Modules\AuditLog\Services;

use App\Models\User;
use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\AuditLog\Models\AuditLog;
use App\Modules\Core\Support\ApiResponse;

final class AuditLogger implements AuditLoggerContract
{
    /**
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    public function log(
        string $module,
        string $action,
        ?string $entityType = null,
        int|string|null $entityId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?int $organizationId = null,
        ?int $storeId = null,
        ?int $userId = null,
    ): AuditLog {
        $request = request();
        $authUser = $request->user();
        $resolvedUser = $authUser instanceof User ? $authUser : null;

        $activeStoreId = $request->attributes->get('active_store_id');

        return AuditLog::query()->create([
            'organization_id' => $organizationId ?? $resolvedUser?->organization_id,
            'store_id' => $storeId ?? (is_int($activeStoreId) ? $activeStoreId : null),
            'user_id' => $userId ?? $resolvedUser?->id,
            'action' => $action,
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId !== null ? (string) $entityId : null,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'request_id' => ApiResponse::requestId(),
        ]);
    }
}
