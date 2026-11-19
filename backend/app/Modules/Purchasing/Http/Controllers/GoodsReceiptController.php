<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Purchasing\Actions\ConfirmGoodsReceiptAction;
use App\Modules\Purchasing\Http\Requests\StoreGoodsReceiptRequest;
use App\Modules\Purchasing\Models\GoodsReceipt;
use App\Modules\Purchasing\Models\GoodsReceiptItem;
use App\Modules\Purchasing\Models\PurchaseOrder;
use App\Modules\Purchasing\Models\PurchaseOrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GoodsReceiptController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('purchasing.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $paginator = GoodsReceipt::query()
            ->with(['purchaseOrder', 'warehouse', 'items'])
            ->where('organization_id', $user->organization_id)
            ->orderByDesc('id')
            ->paginate(20);

        return ApiResponse::success($paginator->items(), 'Goods receipts retrieved.');
    }

    public function store(StoreGoodsReceiptRequest $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $user->organization_id === null) {
            return ApiResponse::error('Organization context required.', 'ORGANIZATION_REQUIRED', 422);
        }

        /** @var array{purchase_order_id: int, notes?: string|null, items: list<array{purchase_order_item_id: int, batch_id?: int|null, qty_received: numeric-string|int|float, qty_damaged?: numeric-string|int|float, discrepancy_notes?: string|null}>} $validated */
        $validated = $request->validated();

        $receipt = DB::transaction(function () use ($user, $validated): GoodsReceipt {
            /** @var PurchaseOrder $po */
            $po = PurchaseOrder::query()
                ->where('organization_id', $user->organization_id)
                ->findOrFail($validated['purchase_order_id']);

            $grn = GoodsReceipt::query()->create([
                'organization_id' => $user->organization_id,
                'purchase_order_id' => $po->id,
                'warehouse_id' => $po->warehouse_id,
                'grn_number' => 'GRN-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)),
                'received_at' => now(),
                'status' => 'draft',
                'notes' => $validated['notes'] ?? null,
                'received_by' => $user->id,
            ]);

            foreach ($validated['items'] as $item) {
                /** @var PurchaseOrderItem $poItem */
                $poItem = PurchaseOrderItem::query()
                    ->where('purchase_order_id', $po->id)
                    ->findOrFail($item['purchase_order_item_id']);

                GoodsReceiptItem::query()->create([
                    'goods_receipt_id' => $grn->id,
                    'purchase_order_item_id' => $poItem->id,
                    'product_variant_id' => $poItem->product_variant_id,
                    'batch_id' => $item['batch_id'] ?? null,
                    'qty_received' => $item['qty_received'],
                    'qty_damaged' => $item['qty_damaged'] ?? '0.0000',
                    'unit_cost' => $poItem->unit_price,
                    'discrepancy_notes' => $item['discrepancy_notes'] ?? null,
                ]);
            }

            return $grn->load(['purchaseOrder', 'warehouse', 'items']);
        });

        return ApiResponse::success($receipt, 'Goods receipt draft created.', 201);
    }

    public function confirm(
        Request $request,
        GoodsReceipt $receipt,
        ConfirmGoodsReceiptAction $action,
    ): JsonResponse {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('purchasing.receive') || $receipt->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $confirmed = $action->execute($receipt, $user->id);

        return ApiResponse::success($confirmed, 'Goods receipt confirmed and inventory updated.');
    }
}
