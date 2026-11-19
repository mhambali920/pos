<?php

declare(strict_types=1);

namespace App\Modules\Organization\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Organization\Models\Organization;
use Illuminate\Support\Facades\DB;

final readonly class UpdateOrganizationAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Organization $organization, array $data): Organization
    {
        return DB::transaction(function () use ($organization, $data): Organization {
            $oldValues = $organization->toArray();
            $organization->update($data);
            $organization->refresh();

            $this->auditLogger->log(
                module: 'Organization',
                action: 'organization.updated',
                entityType: Organization::class,
                entityId: $organization->id,
                oldValues: $oldValues,
                newValues: $organization->toArray(),
                organizationId: $organization->id,
            );

            return $organization;
        });
    }
}
