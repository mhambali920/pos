<?php

declare(strict_types=1);

namespace App\Modules\StockTransfer\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\StockTransfer\Actions\CancelStockTransferAction;
use App\Modules\StockTransfer\Actions\CreateStockTransferAction;
use App\Modules\StockTransfer\Actions\ReceiveStockTransferAction;
use App\Modules\StockTransfer\Actions\ShipStockTransferAction;
use App\Modules\StockTransfer\Http\Requests\StoreStockTransferRequest;
use App\Modules\StockTransfer\Http\Resources\StockTransferResource;
use App\Modules\StockTransfer\Models\StockTransfer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockTransferController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $paginator = StockTransfer::query()
            ->with(['fromWarehouse', 'toWarehouse', 'items.variant'])
            ->where('organization_id', $user->organization_id)
            ->orderByDesc('id')
            ->paginate(20);

        return ApiResponse::paginated($paginator, StockTransferResource::collection($paginator));
    }

    public function store(StoreStockTransferRequest $request, CreateStockTransferAction $action): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $user->organization_id === null) {
            return ApiResponse::error('Organization context required.', 'ORGANIZATION_REQUIRED', 422);
        }

        $transfer = $action->execute($user->organization_id, $user->id, $request->validated());

        return ApiResponse::success(new StockTransferResource($transfer), 'Stock transfer draft created.', 201);
    }

    public function show(Request $request, StockTransfer $transfer): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.view') || $transfer->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        return ApiResponse::success(
            new StockTransferResource($transfer->load(['fromWarehouse', 'toWarehouse', 'items.variant'])),
        );
    }

    public function ship(Request $request, StockTransfer $transfer, ShipStockTransferAction $action): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.transfer') || $transfer->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $shipped = $action->execute($transfer, $user->id);

        return ApiResponse::success(new StockTransferResource($shipped), 'Stock transfer shipped.');
    }

    public function receive(Request $request, StockTransfer $transfer, ReceiveStockTransferAction $action): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.transfer') || $transfer->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $received = $action->execute($transfer, $user->id);

        return ApiResponse::success(new StockTransferResource($received), 'Stock transfer received.');
    }

    public function cancel(Request $request, StockTransfer $transfer, CancelStockTransferAction $action): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('inventory.approve') || $transfer->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $cancelled = $action->execute($transfer, $user->id);

        return ApiResponse::success(new StockTransferResource($cancelled), 'Stock transfer cancelled.');
    }
}
