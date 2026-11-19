<?php

declare(strict_types=1);

namespace App\Modules\StockAdjustment\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\StockAdjustment\Actions\ApproveStockAdjustmentAction;
use App\Modules\StockAdjustment\Actions\CreateStockAdjustmentAction;
use App\Modules\StockAdjustment\Http\Requests\StoreStockAdjustmentRequest;
use App\Modules\StockAdjustment\Http\Resources\StockAdjustmentResource;
use App\Modules\StockAdjustment\Models\StockAdjustment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockAdjustmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $paginator = StockAdjustment::query()
            ->with(['warehouse', 'items.variant'])
            ->where('organization_id', $user->organization_id)
            ->orderByDesc('id')
            ->paginate(20);

        return ApiResponse::paginated($paginator, StockAdjustmentResource::collection($paginator));
    }

    public function store(StoreStockAdjustmentRequest $request, CreateStockAdjustmentAction $action): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $user->organization_id === null) {
            return ApiResponse::error('Organization context required.', 'ORGANIZATION_REQUIRED', 422);
        }

        $adjustment = $action->execute($user->organization_id, $user->id, $request->validated());

        return ApiResponse::success(
            new StockAdjustmentResource($adjustment),
            'Stock adjustment draft created.',
            201,
        );
    }

    public function show(Request $request, StockAdjustment $adjustment): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.view') || $adjustment->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        return ApiResponse::success(new StockAdjustmentResource($adjustment->load(['warehouse', 'items.variant'])));
    }

    public function approve(
        Request $request,
        StockAdjustment $adjustment,
        ApproveStockAdjustmentAction $action,
    ): JsonResponse {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.approve') || $adjustment->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $approved = $action->execute($adjustment, $user->id);

        return ApiResponse::success(new StockAdjustmentResource($approved), 'Stock adjustment approved.');
    }
}
