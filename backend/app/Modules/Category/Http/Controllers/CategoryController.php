<?php

declare(strict_types=1);

namespace App\Modules\Category\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Category\Http\Requests\StoreCategoryRequest;
use App\Modules\Category\Http\Requests\UpdateCategoryRequest;
use App\Modules\Category\Http\Resources\CategoryResource;
use App\Modules\Category\Models\Category;
use App\Modules\Core\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Category::class);

        /** @var User $user */
        $user = $request->user();

        $query = Category::query()
            ->with('parent')
            ->where('organization_id', $user->organization_id);

        if ($request->filled('search')) {
            $search = (string) $request->string('search');
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $perPage = min(max((int) $request->integer('per_page', 50), 1), 100);
        $paginator = $query->orderBy('name')->orderBy('id')->paginate($perPage);

        return ApiResponse::paginated($paginator, CategoryResource::collection($paginator));
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        /** @var array<string, mixed> $validated */
        $validated = $request->validated();

        $name = is_string($validated['name']) ? $validated['name'] : '';
        $slug = is_string($validated['slug'] ?? null) && $validated['slug'] !== ''
            ? $validated['slug']
            : Str::slug($name);

        $category = Category::query()->create(array_merge($validated, [
            'organization_id' => $user->organization_id,
            'slug' => $slug,
        ]));

        return ApiResponse::success(
            new CategoryResource($category->load('parent')),
            'Category created successfully.',
            201,
        );
    }

    public function show(Category $category): JsonResponse
    {
        Gate::authorize('view', $category);

        return ApiResponse::success(new CategoryResource($category->load('parent')));
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        Gate::authorize('update', $category);

        $category->update($request->validated());

        return ApiResponse::success(
            new CategoryResource($category->refresh()->load('parent')),
            'Category updated successfully.',
        );
    }

    public function destroy(Category $category): JsonResponse
    {
        Gate::authorize('delete', $category);

        $category->delete();

        return ApiResponse::success(null, 'Category deleted successfully.');
    }
}
