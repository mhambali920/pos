<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Purchasing\Actions\CreatePurchaseOrderAction;
use App\Modules\Purchasing\Actions\UpdatePurchaseOrderStatusAction;
use App\Modules\Purchasing\Http\Requests\StorePurchaseOrderRequest;
use App\Modules\Purchasing\Models\PurchaseOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('purchasing.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $query = PurchaseOrder::query()
            ->with(['supplier', 'warehouse', 'items'])
            ->where('organization_id', $user->organization_id);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        $paginator = $query->orderByDesc('id')->paginate(20);

        return ApiResponse::success($paginator->items(), 'Purchase orders retrieved.', 200, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function store(StorePurchaseOrderRequest $request, CreatePurchaseOrderAction $action): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $user->organization_id === null) {
            return ApiResponse::error('Organization context required.', 'ORGANIZATION_REQUIRED', 422);
        }

        $po = $action->execute($user->organization_id, $user->id, $request->validated());

        return ApiResponse::success($po, 'Purchase order created.', 201);
    }

    public function show(Request $request, PurchaseOrder $order): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('purchasing.view') || $order->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        return ApiResponse::success($order->load(['supplier', 'warehouse', 'items']));
    }

    public function submit(Request $request, PurchaseOrder $order, UpdatePurchaseOrderStatusAction $action): JsonResponse
    {
        return $this->transition($request, $order, $action, 'submit', 'purchasing.update');
    }

    public function approve(Request $request, PurchaseOrder $order, UpdatePurchaseOrderStatusAction $action): JsonResponse
    {
        return $this->transition($request, $order, $action, 'approve', 'purchasing.approve');
    }

    public function reject(Request $request, PurchaseOrder $order, UpdatePurchaseOrderStatusAction $action): JsonResponse
    {
        return $this->transition($request, $order, $action, 'reject', 'purchasing.approve');
    }

    public function cancel(Request $request, PurchaseOrder $order, UpdatePurchaseOrderStatusAction $action): JsonResponse
    {
        return $this->transition($request, $order, $action, 'cancel', 'purchasing.update');
    }

    private function transition(
        Request $request,
        PurchaseOrder $order,
        UpdatePurchaseOrderStatusAction $action,
        string $verb,
        string $permission,
    ): JsonResponse {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can($permission) || $order->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $updated = $action->execute($order, $verb, $user->id);

        return ApiResponse::success($updated, "Purchase order {$verb} successful.");
    }
}
