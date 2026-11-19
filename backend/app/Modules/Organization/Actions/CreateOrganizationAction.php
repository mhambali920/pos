<?php

declare(strict_types=1);

namespace App\Modules\Organization\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Organization\Models\Organization;
use Illuminate\Support\Facades\DB;

final readonly class CreateOrganizationAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): Organization
    {
        return DB::transaction(function () use ($data): Organization {
            $organization = Organization::query()->create($data);

            $this->auditLogger->log(
                module: 'Organization',
                action: 'organization.created',
                entityType: Organization::class,
                entityId: $organization->id,
                newValues: $organization->toArray(),
                organizationId: $organization->id,
            );

            return $organization;
        });
    }
}
