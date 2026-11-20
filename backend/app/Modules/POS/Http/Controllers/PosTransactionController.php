<?php

declare(strict_types=1);

namespace App\Modules\POS\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\POS\Actions\CompletePosCheckoutAction;
use App\Modules\POS\Actions\CreatePosTransactionAction;
use App\Modules\POS\Actions\RecordPosPaymentAction;
use App\Modules\POS\Http\Requests\CreatePosTransactionRequest;
use App\Modules\POS\Http\Requests\RecordPosPaymentRequest;
use App\Modules\Sales\Models\Sale;
use App\Modules\Sales\Services\ReceiptService;
use App\Modules\Store\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosTransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        $query = Sale::query()
            ->with(['items', 'payments.method', 'customer', 'cashier'])
            ->where('store_id', $store->id);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        $paginator = $query->orderByDesc('created_at')->orderByDesc('id')->paginate(20);

        return ApiResponse::success($paginator->items(), 'POS transactions retrieved.');
    }

    public function store(
        CreatePosTransactionRequest $request,
        CreatePosTransactionAction $action,
    ): JsonResponse {
        /** @var User $cashier */
        $cashier = $request->user();
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        $sale = $action->execute($cashier, $store, $request->validated());

        return ApiResponse::success($sale, 'POS transaction created.', 201);
    }

    public function show(Request $request, Sale $sale): JsonResponse
    {
        /** @var Store $store */
        $store = $request->attributes->get('active_store');
        if ($sale->store_id !== $store->id) {
            return ApiResponse::error('Transaction does not belong to active store.', 'STORE_FORBIDDEN', 403);
        }

        return ApiResponse::success($sale->load(['items', 'payments.method', 'customer', 'cashier']));
    }

    public function hold(Request $request, Sale $sale): JsonResponse
    {
        /** @var Store $store */
        $store = $request->attributes->get('active_store');
        if ($sale->store_id !== $store->id) {
            return ApiResponse::error('Forbidden.', 'STORE_FORBIDDEN', 403);
        }

        if (! in_array($sale->status, ['draft', 'pending_payment'], true)) {
            return ApiResponse::error('Only open transactions can be held.', 'INVALID_STATUS', 422);
        }

        $sale->update(['status' => 'held']);

        return ApiResponse::success($sale->refresh()->load(['items', 'customer']), 'Transaction held.');
    }

    public function resume(Request $request, Sale $sale): JsonResponse
    {
        /** @var Store $store */
        $store = $request->attributes->get('active_store');
        if ($sale->store_id !== $store->id) {
            return ApiResponse::error('Forbidden.', 'STORE_FORBIDDEN', 403);
        }

        if ($sale->status !== 'held') {
            return ApiResponse::error('Only held transactions can be resumed.', 'INVALID_STATUS', 422);
        }

        $sale->update(['status' => 'pending_payment']);

        return ApiResponse::success($sale->refresh()->load(['items', 'customer']), 'Transaction resumed.');
    }

    public function recordPayment(
        RecordPosPaymentRequest $request,
        Sale $sale,
        RecordPosPaymentAction $action,
    ): JsonResponse {
        /** @var User $cashier */
        $cashier = $request->user();
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        if ($sale->store_id !== $store->id) {
            return ApiResponse::error('Forbidden.', 'STORE_FORBIDDEN', 403);
        }

        /** @var array{payments: list<array<string, mixed>>} $validated */
        $validated = $request->validated();
        $payments = $action->execute($sale, $validated['payments'], $cashier->id);

        return ApiResponse::success($payments, 'Payment recorded.', 201);
    }

    public function complete(
        Request $request,
        Sale $sale,
        CompletePosCheckoutAction $action,
        ReceiptService $receiptService,
    ): JsonResponse {
        /** @var User $cashier */
        $cashier = $request->user();
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        if ($sale->store_id !== $store->id) {
            return ApiResponse::error('Forbidden.', 'STORE_FORBIDDEN', 403);
        }

        $completed = $action->execute($sale, $store, $cashier->id);

        return ApiResponse::success([
            'sale' => $completed,
            'receipt' => $receiptService->build($completed, (string) $request->string('paper_size', '80mm')),
        ], 'Transaction completed successfully.');
    }

    public function receipt(Request $request, Sale $sale, ReceiptService $receiptService): JsonResponse
    {
        /** @var Store $store */
        $store = $request->attributes->get('active_store');
        if ($sale->store_id !== $store->id) {
            return ApiResponse::error('Forbidden.', 'STORE_FORBIDDEN', 403);
        }

        return ApiResponse::success(
            $receiptService->build($sale, (string) $request->string('paper_size', '80mm')),
        );
    }
}
