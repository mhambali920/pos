<?php

declare(strict_types=1);

namespace App\Modules\Unit\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Unit\Http\Requests\StoreUnitConversionRequest;
use App\Modules\Unit\Http\Requests\StoreUnitRequest;
use App\Modules\Unit\Http\Resources\UnitResource;
use App\Modules\Unit\Models\Unit;
use App\Modules\Unit\Models\UnitConversion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class UnitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Unit::class);

        /** @var User $user */
        $user = $request->user();

        $paginator = Unit::query()
            ->with('conversionsFrom.toUnit')
            ->where('organization_id', $user->organization_id)
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(50);

        return ApiResponse::paginated($paginator, UnitResource::collection($paginator));
    }

    public function store(StoreUnitRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $unit = Unit::query()->create(array_merge($request->validated(), [
            'organization_id' => $user->organization_id,
        ]));

        return ApiResponse::success(
            new UnitResource($unit->load('conversionsFrom.toUnit')),
            'Unit created successfully.',
            201,
        );
    }

    public function show(Unit $unit): JsonResponse
    {
        Gate::authorize('view', $unit);

        return ApiResponse::success(new UnitResource($unit->load('conversionsFrom.toUnit')));
    }

    public function update(Request $request, Unit $unit): JsonResponse
    {
        Gate::authorize('update', $unit);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'allow_decimal' => ['sometimes', 'boolean'],
        ]);

        $unit->update($validated);

        return ApiResponse::success(
            new UnitResource($unit->refresh()->load('conversionsFrom.toUnit')),
            'Unit updated successfully.',
        );
    }

    public function destroy(Unit $unit): JsonResponse
    {
        Gate::authorize('delete', $unit);

        $unit->delete();

        return ApiResponse::success(null, 'Unit deleted successfully.');
    }

    public function upsertConversion(StoreUnitConversionRequest $request, Unit $unit): JsonResponse
    {
        Gate::authorize('update', $unit);

        /** @var array{to_unit_id: int, multiplier: numeric-string|int|float} $validated */
        $validated = $request->validated();

        $conversion = UnitConversion::query()->updateOrCreate(
            [
                'organization_id' => $unit->organization_id,
                'from_unit_id' => $unit->id,
                'to_unit_id' => $validated['to_unit_id'],
            ],
            [
                'multiplier' => $validated['multiplier'],
            ],
        );

        return ApiResponse::success([
            'id' => $conversion->id,
            'from_unit_id' => $conversion->from_unit_id,
            'to_unit_id' => $conversion->to_unit_id,
            'multiplier' => $conversion->multiplier,
        ], 'Unit conversion saved.', 201);
    }
}
