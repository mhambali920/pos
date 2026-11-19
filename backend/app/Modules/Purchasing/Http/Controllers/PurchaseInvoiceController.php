<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Purchasing\Actions\CreatePurchaseInvoiceAction;
use App\Modules\Purchasing\Actions\RecordPurchasePaymentAction;
use App\Modules\Purchasing\Http\Requests\StorePurchaseInvoiceRequest;
use App\Modules\Purchasing\Http\Requests\StorePurchasePaymentRequest;
use App\Modules\Purchasing\Models\PurchaseInvoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseInvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('purchasing.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $paginator = PurchaseInvoice::query()
            ->with(['supplier', 'purchaseOrder', 'payments'])
            ->where('organization_id', $user->organization_id)
            ->orderByDesc('id')
            ->paginate(20);

        return ApiResponse::success($paginator->items(), 'Purchase invoices retrieved.');
    }

    public function store(StorePurchaseInvoiceRequest $request, CreatePurchaseInvoiceAction $action): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $user->organization_id === null) {
            return ApiResponse::error('Organization context required.', 'ORGANIZATION_REQUIRED', 422);
        }

        $invoice = $action->execute($user->organization_id, $user->id, $request->validated());

        return ApiResponse::success($invoice, 'Purchase invoice recorded.', 201);
    }

    public function recordPayment(
        StorePurchasePaymentRequest $request,
        PurchaseInvoice $invoice,
        RecordPurchasePaymentAction $action,
    ): JsonResponse {
        $user = $request->user();
        if (! $user instanceof User || $invoice->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $payment = $action->execute($invoice, $user->id, $request->validated());

        return ApiResponse::success($payment, 'Purchase payment recorded.', 201);
    }
}
