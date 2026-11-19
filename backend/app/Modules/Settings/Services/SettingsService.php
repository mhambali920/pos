<?php

declare(strict_types=1);

namespace App\Modules\Settings\Services;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Settings\Models\Setting;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final readonly class SettingsService
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @return Collection<int, Setting>
     */
    public function list(int $organizationId, ?int $storeId = null, ?string $group = null): Collection
    {
        $query = Setting::query()->where('organization_id', $organizationId);

        if ($storeId !== null) {
            $query->where('store_id', $storeId);
        } else {
            $query->whereNull('store_id');
        }

        if ($group !== null && $group !== '') {
            $query->where('group', $group);
        }

        return $query->orderBy('group')->orderBy('key')->get();
    }

    /**
     * @param  array<int, array{group: string, key: string, value: mixed}>  $items
     * @return Collection<int, Setting>
     */
    public function upsertMany(int $organizationId, ?int $storeId, array $items): Collection
    {
        return DB::transaction(function () use ($organizationId, $storeId, $items): Collection {
            $updated = collect();

            foreach ($items as $item) {
                $existing = Setting::query()
                    ->where('organization_id', $organizationId)
                    ->where('store_id', $storeId)
                    ->where('group', $item['group'])
                    ->where('key', $item['key'])
                    ->first();

                $oldValue = $existing?->value;

                $setting = Setting::query()->updateOrCreate(
                    [
                        'organization_id' => $organizationId,
                        'store_id' => $storeId,
                        'group' => $item['group'],
                        'key' => $item['key'],
                    ],
                    [
                        'value' => ['data' => $item['value']],
                    ],
                );

                $this->auditLogger->log(
                    module: 'Settings',
                    action: 'settings.updated',
                    entityType: Setting::class,
                    entityId: $setting->id,
                    oldValues: ['key' => $item['group'].'.'.$item['key'], 'value' => $oldValue],
                    newValues: ['key' => $item['group'].'.'.$item['key'], 'value' => $setting->value],
                    organizationId: $organizationId,
                    storeId: $storeId,
                );

                $updated->push($setting);
            }

            return $updated;
        });
    }
}
