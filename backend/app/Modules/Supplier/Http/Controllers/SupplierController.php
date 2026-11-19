<?php

declare(strict_types=1);

namespace App\Modules\Supplier\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Supplier\Http\Requests\StoreSupplierRequest;
use App\Modules\Supplier\Http\Requests\UpdateSupplierRequest;
use App\Modules\Supplier\Http\Resources\SupplierResource;
use App\Modules\Supplier\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Supplier::class);

        /** @var User $user */
        $user = $request->user();

        $query = Supplier::query()->where('organization_id', $user->organization_id);

        if ($request->filled('search')) {
            $search = (string) $request->string('search');
            $query->where(function ($q) use ($search): void {
                $q->where('company_name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%");
            });
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);
        $paginator = $query->orderBy('company_name')->orderBy('id')->paginate($perPage);

        return ApiResponse::paginated($paginator, SupplierResource::collection($paginator));
    }

    public function store(StoreSupplierRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $supplier = Supplier::query()->create(array_merge($request->validated(), [
            'organization_id' => $user->organization_id,
        ]));

        return ApiResponse::success(new SupplierResource($supplier), 'Supplier created successfully.', 201);
    }

    public function show(Supplier $supplier): JsonResponse
    {
        Gate::authorize('view', $supplier);

        return ApiResponse::success(new SupplierResource($supplier));
    }

    public function update(UpdateSupplierRequest $request, Supplier $supplier): JsonResponse
    {
        Gate::authorize('update', $supplier);

        $supplier->update($request->validated());

        return ApiResponse::success(new SupplierResource($supplier->refresh()), 'Supplier updated successfully.');
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        Gate::authorize('delete', $supplier);

        $supplier->delete();

        return ApiResponse::success(null, 'Supplier deleted successfully.');
    }
}
