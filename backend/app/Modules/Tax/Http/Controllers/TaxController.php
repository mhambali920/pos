<?php

declare(strict_types=1);

namespace App\Modules\Tax\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Tax\Http\Requests\StoreTaxRequest;
use App\Modules\Tax\Http\Resources\TaxResource;
use App\Modules\Tax\Models\Tax;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TaxController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Tax::class);

        /** @var User $user */
        $user = $request->user();

        $paginator = Tax::query()
            ->where('organization_id', $user->organization_id)
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(50);

        return ApiResponse::paginated($paginator, TaxResource::collection($paginator));
    }

    public function store(StoreTaxRequest $request, AuditLoggerContract $auditLogger): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $tax = Tax::query()->create(array_merge($request->validated(), [
            'organization_id' => $user->organization_id,
        ]));

        $auditLogger->log(
            module: 'Tax',
            action: 'tax.created',
            entityType: Tax::class,
            entityId: $tax->id,
            newValues: $tax->toArray(),
            organizationId: $user->organization_id,
        );

        return ApiResponse::success(new TaxResource($tax), 'Tax configuration created.', 201);
    }

    public function show(Tax $tax): JsonResponse
    {
        Gate::authorize('view', $tax);

        return ApiResponse::success(new TaxResource($tax));
    }

    public function update(Request $request, Tax $tax, AuditLoggerContract $auditLogger): JsonResponse
    {
        Gate::authorize('update', $tax);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'rate' => ['sometimes', 'required', 'numeric', 'min:0', 'max:100'],
            'type' => ['sometimes', 'required', 'in:inclusive,exclusive'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $old = $tax->toArray();
        $tax->update($validated);
        $tax->refresh();

        $auditLogger->log(
            module: 'Tax',
            action: 'tax.updated',
            entityType: Tax::class,
            entityId: $tax->id,
            oldValues: $old,
            newValues: $tax->toArray(),
            organizationId: $tax->organization_id,
        );

        return ApiResponse::success(new TaxResource($tax), 'Tax configuration updated.');
    }

    public function destroy(Tax $tax): JsonResponse
    {
        Gate::authorize('delete', $tax);

        $tax->delete();

        return ApiResponse::success(null, 'Tax configuration deleted.');
    }
}
