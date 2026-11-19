<?php

declare(strict_types=1);

namespace App\Modules\Brand\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Brand\Http\Requests\StoreBrandRequest;
use App\Modules\Brand\Http\Requests\UpdateBrandRequest;
use App\Modules\Brand\Http\Resources\BrandResource;
use App\Modules\Brand\Models\Brand;
use App\Modules\Core\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class BrandController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Brand::class);

        /** @var User $user */
        $user = $request->user();

        $query = Brand::query()->where('organization_id', $user->organization_id);

        if ($request->filled('search')) {
            $search = (string) $request->string('search');
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $perPage = min(max((int) $request->integer('per_page', 50), 1), 100);
        $paginator = $query->orderBy('name')->orderBy('id')->paginate($perPage);

        return ApiResponse::paginated($paginator, BrandResource::collection($paginator));
    }

    public function store(StoreBrandRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $brand = Brand::query()->create(array_merge($request->validated(), [
            'organization_id' => $user->organization_id,
        ]));

        return ApiResponse::success(new BrandResource($brand), 'Brand created successfully.', 201);
    }

    public function show(Brand $brand): JsonResponse
    {
        Gate::authorize('view', $brand);

        return ApiResponse::success(new BrandResource($brand));
    }

    public function update(UpdateBrandRequest $request, Brand $brand): JsonResponse
    {
        Gate::authorize('update', $brand);

        $brand->update($request->validated());

        return ApiResponse::success(new BrandResource($brand->refresh()), 'Brand updated successfully.');
    }

    public function destroy(Brand $brand): JsonResponse
    {
        Gate::authorize('delete', $brand);

        $brand->delete();

        return ApiResponse::success(null, 'Brand deleted successfully.');
    }
}
