<?php

declare(strict_types=1);

namespace App\Modules\Warehouse\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Warehouse\Http\Requests\StoreWarehouseRequest;
use App\Modules\Warehouse\Http\Resources\WarehouseResource;
use App\Modules\Warehouse\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class WarehouseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Warehouse::class);

        /** @var User $user */
        $user = $request->user();

        $query = Warehouse::query()
            ->with('store')
            ->where('organization_id', $user->organization_id);

        if (! $user->can('stores.access_all')) {
            $assignedIds = $user->stores()->pluck('stores.id');
            $query->where(function ($q) use ($assignedIds): void {
                $q->whereNull('store_id')->orWhereIn('store_id', $assignedIds);
            });
        }

        $paginator = $query->orderBy('name')->orderBy('id')->paginate(50);

        return ApiResponse::paginated($paginator, WarehouseResource::collection($paginator));
    }

    public function store(StoreWarehouseRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $warehouse = Warehouse::query()->create(array_merge($request->validated(), [
            'organization_id' => $user->organization_id,
        ]));

        return ApiResponse::success(
            new WarehouseResource($warehouse->load('store')),
            'Warehouse created successfully.',
            201,
        );
    }

    public function show(Warehouse $warehouse): JsonResponse
    {
        Gate::authorize('view', $warehouse);

        return ApiResponse::success(new WarehouseResource($warehouse->load('store')));
    }

    public function update(Request $request, Warehouse $warehouse): JsonResponse
    {
        Gate::authorize('update', $warehouse);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:1000'],
            'is_default' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        $warehouse->update($validated);

        return ApiResponse::success(
            new WarehouseResource($warehouse->refresh()->load('store')),
            'Warehouse updated successfully.',
        );
    }

    public function destroy(Warehouse $warehouse): JsonResponse
    {
        Gate::authorize('delete', $warehouse);

        $warehouse->delete();

        return ApiResponse::success(null, 'Warehouse deleted successfully.');
    }
}
