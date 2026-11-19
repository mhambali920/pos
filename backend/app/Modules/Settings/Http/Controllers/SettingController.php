<?php

declare(strict_types=1);

namespace App\Modules\Settings\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Settings\Http\Requests\UpdateSettingsRequest;
use App\Modules\Settings\Models\Setting;
use App\Modules\Settings\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(Request $request, SettingsService $service): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('settings.view') || $user->organization_id === null) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $storeId = $request->filled('store_id') ? $request->integer('store_id') : null;
        if ($storeId !== null && ! $user->canAccessStore($storeId)) {
            return ApiResponse::error('Forbidden.', 'STORE_FORBIDDEN', 403);
        }

        $group = $request->filled('group') ? (string) $request->string('group') : null;
        $settings = $service->list($user->organization_id, $storeId, $group);

        return ApiResponse::success(
            $settings->map(fn (Setting $s): array => [
                'id' => $s->id,
                'group' => $s->group,
                'key' => $s->key,
                'value' => is_array($s->value) && array_key_exists('data', $s->value) ? $s->value['data'] : $s->value,
                'store_id' => $s->store_id,
            ])->values()->all(),
        );
    }

    public function update(UpdateSettingsRequest $request, SettingsService $service): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $user->organization_id === null) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var array{store_id?: int|null, settings: array<int, array{group: string, key: string, value: mixed}>} $validated */
        $validated = $request->validated();
        $storeId = $validated['store_id'] ?? null;

        if ($storeId !== null && ! $user->canAccessStore($storeId)) {
            return ApiResponse::error('Forbidden.', 'STORE_FORBIDDEN', 403);
        }

        $updated = $service->upsertMany($user->organization_id, $storeId, $validated['settings']);

        return ApiResponse::success(
            $updated->map(fn (Setting $s): array => [
                'id' => $s->id,
                'group' => $s->group,
                'key' => $s->key,
                'value' => is_array($s->value) && array_key_exists('data', $s->value) ? $s->value['data'] : $s->value,
                'store_id' => $s->store_id,
            ])->values()->all(),
            'Settings updated successfully.',
        );
    }
}
