<?php

declare(strict_types=1);

namespace App\Modules\Store\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Store\Models\Store;
use Illuminate\Support\Facades\DB;

final readonly class UpdateStoreAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Store $store, array $data): Store
    {
        return DB::transaction(function () use ($store, $data): Store {
            $oldValues = $store->toArray();
            $store->update($data);
            $store->refresh();

            $this->auditLogger->log(
                module: 'Store',
                action: 'store.updated',
                entityType: Store::class,
                entityId: $store->id,
                oldValues: $oldValues,
                newValues: $store->toArray(),
                organizationId: $store->organization_id,
                storeId: $store->id,
            );

            return $store;
        });
    }
}
