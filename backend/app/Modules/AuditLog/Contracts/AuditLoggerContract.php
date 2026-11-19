<?php

declare(strict_types=1);

namespace App\Modules\AuditLog\Contracts;

use App\Modules\AuditLog\Models\AuditLog;

interface AuditLoggerContract
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
    ): AuditLog;
}
