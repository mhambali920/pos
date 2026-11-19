<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Organization\Actions\CreateOrganizationAction;
use App\Modules\Organization\Actions\UpdateOrganizationAction;
use App\Modules\Organization\Http\Requests\StoreOrganizationRequest;
use App\Modules\Organization\Http\Requests\UpdateOrganizationRequest;
use App\Modules\Organization\Http\Resources\OrganizationResource;
use App\Modules\Organization\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OrganizationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Organization::class);

        /** @var User $user */
        $user = $request->user();

        $query = Organization::query();
        if (! $user->hasRole('Super Admin')) {
            $query->where('id', $user->organization_id);
        }

        $paginator = $query->orderByDesc('id')->paginate(20);

        return ApiResponse::paginated($paginator, OrganizationResource::collection($paginator));
    }

    public function store(StoreOrganizationRequest $request, CreateOrganizationAction $action): JsonResponse
    {
        $organization = $action->execute($request->validated());

        return ApiResponse::success(
            new OrganizationResource($organization),
            'Organization created successfully.',
            201,
        );
    }

    public function show(Organization $organization): JsonResponse
    {
        Gate::authorize('view', $organization);

        return ApiResponse::success(new OrganizationResource($organization));
    }

    public function update(
        UpdateOrganizationRequest $request,
        Organization $organization,
        UpdateOrganizationAction $action,
    ): JsonResponse {
        Gate::authorize('update', $organization);

        $updated = $action->execute($organization, $request->validated());

        return ApiResponse::success(new OrganizationResource($updated), 'Organization updated successfully.');
    }
}
