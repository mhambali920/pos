<?php

declare(strict_types=1);

namespace App\Modules\Store\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Store\Models\Store;
use Illuminate\Support\Facades\DB;

final readonly class CreateStoreAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(int $organizationId, array $data): Store
    {
        return DB::transaction(function () use ($organizationId, $data): Store {
            $store = Store::query()->create(array_merge($data, [
                'organization_id' => $organizationId,
            ]));

            $this->auditLogger->log(
                module: 'Store',
                action: 'store.created',
                entityType: Store::class,
                entityId: $store->id,
                newValues: $store->toArray(),
                organizationId: $organizationId,
                storeId: $store->id,
            );

            return $store;
        });
    }
}
