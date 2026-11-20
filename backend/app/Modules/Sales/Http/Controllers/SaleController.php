<?php

declare(strict_types=1);

namespace App\Modules\Sales\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Sales\Actions\CreateSaleReturnAction;
use App\Modules\Sales\Actions\VoidSaleAction;
use App\Modules\Sales\Http\Requests\RefundSaleRequest;
use App\Modules\Sales\Models\Sale;
use App\Modules\Sales\Models\SaleReturn;
use App\Modules\Sales\Services\ReceiptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('sales.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $query = Sale::query()
            ->with(['store', 'customer', 'cashier', 'items.returnItems', 'payments.method'])
            ->where('organization_id', $user->organization_id);

        if (! $user->can('stores.access_all')) {
            $assignedIds = $user->stores()->pluck('stores.id');
            $query->whereIn('store_id', $assignedIds);
        }

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        $paginator = $query->orderByDesc('created_at')->orderByDesc('id')->paginate(20);

        return ApiResponse::success($paginator->items(), 'Sales retrieved.', 200, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, Sale $sale): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('sales.view') || $sale->organization_id !== $user->organization_id || ! $user->canAccessStore($sale->store_id)) {
            return ApiResponse::error('Forbidden.', 'STORE_FORBIDDEN', 403);
        }

        return ApiResponse::success($sale->load(['store', 'customer', 'cashier', 'items.returnItems', 'payments.method', 'returns.items']));
    }

    public function returns(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('sales.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $query = SaleReturn::query()
            ->with(['sale', 'store', 'refundMethod', 'creator', 'items.saleItem'])
            ->where('organization_id', $user->organization_id);

        if (! $user->can('stores.access_all')) {
            $assignedIds = $user->stores()->pluck('stores.id');
            $query->whereIn('store_id', $assignedIds);
        }

        $paginator = $query->orderByDesc('created_at')->orderByDesc('id')->paginate(20);

        return ApiResponse::success($paginator->items(), 'Sale returns retrieved.', 200, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function refund(RefundSaleRequest $request, Sale $sale, CreateSaleReturnAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var array{
         *     reason: string,
         *     type?: string,
         *     refund_method_id?: int|null,
         *     cash_register_session_id?: int|null,
         *     exchange_sale_id?: int|null,
         *     items: list<array{sale_item_id: int, quantity: numeric-string, condition?: string}>
         * } $validated
         */
        $validated = $request->validated();

        $saleReturn = $action->execute($sale, $validated, $user->id);

        return ApiResponse::success($saleReturn, 'Sale return processed successfully.', 201);
    }

    public function receipt(Request $request, Sale $sale, ReceiptService $receiptService): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('sales.view') || $sale->organization_id !== $user->organization_id || ! $user->canAccessStore($sale->store_id)) {
            return ApiResponse::error('Forbidden.', 'STORE_FORBIDDEN', 403);
        }

        $paperSize = (string) $request->string('paper_size', '80mm');

        return ApiResponse::success($receiptService->build($sale, $paperSize));
    }

    public function void(Request $request, Sale $sale, VoidSaleAction $action): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('sales.cancel') || $sale->organization_id !== $user->organization_id || ! $user->canAccessStore($sale->store_id)) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var array{reason: string} $validated */
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        $voided = $action->execute($sale, $validated['reason'], $user->id);

        return ApiResponse::success($voided, 'Sale cancelled successfully.');
    }
}
