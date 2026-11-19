<?php

declare(strict_types=1);

namespace App\Modules\Store\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Store\Actions\CreateStoreAction;
use App\Modules\Store\Actions\UpdateStoreAction;
use App\Modules\Store\Http\Requests\StoreStoreRequest;
use App\Modules\Store\Http\Requests\UpdateStoreRequest;
use App\Modules\Store\Http\Resources\StoreResource;
use App\Modules\Store\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class StoreController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Store::class);

        /** @var User $user */
        $user = $request->user();

        $query = Store::query()->where('organization_id', $user->organization_id);

        if (! $user->can('stores.access_all')) {
            $assignedIds = $user->stores()->pluck('stores.id');
            $query->whereIn('id', $assignedIds);
        }

        if ($request->filled('search')) {
            $search = (string) $request->string('search');
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);
        $paginator = $query->orderByDesc('id')->paginate($perPage);

        return ApiResponse::paginated($paginator, StoreResource::collection($paginator));
    }

    public function store(StoreStoreRequest $request, CreateStoreAction $action): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $user->organization_id === null) {
            return ApiResponse::error('Organization context required.', 'ORGANIZATION_REQUIRED', 422);
        }

        $store = $action->execute($user->organization_id, $request->validated());

        return ApiResponse::success(new StoreResource($store), 'Store created successfully.', 201);
    }

    public function show(Store $store): JsonResponse
    {
        Gate::authorize('view', $store);

        return ApiResponse::success(new StoreResource($store));
    }

    public function update(UpdateStoreRequest $request, Store $store, UpdateStoreAction $action): JsonResponse
    {
        Gate::authorize('update', $store);

        $updated = $action->execute($store, $request->validated());

        return ApiResponse::success(new StoreResource($updated), 'Store updated successfully.');
    }

    public function destroy(Store $store, AuditLoggerContract $auditLogger): JsonResponse
    {
        Gate::authorize('delete', $store);

        $old = $store->toArray();
        $store->delete();

        $auditLogger->log(
            module: 'Store',
            action: 'store.deleted',
            entityType: Store::class,
            entityId: $store->id,
            oldValues: $old,
            organizationId: $store->organization_id,
            storeId: $store->id,
        );

        return ApiResponse::success(null, 'Store deleted successfully.');
    }

    public function context(Request $request): JsonResponse
    {
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        return ApiResponse::success(new StoreResource($store), 'Active store context verified.');
    }
}
