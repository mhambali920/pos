<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Domain\ValueObjects\Money;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Purchasing\Actions\ConfirmPurchaseReturnAction;
use App\Modules\Purchasing\Http\Requests\StorePurchaseReturnRequest;
use App\Modules\Purchasing\Models\PurchaseOrder;
use App\Modules\Purchasing\Models\PurchaseReturn;
use App\Modules\Purchasing\Models\PurchaseReturnItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseReturnController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('purchasing.view')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $paginator = PurchaseReturn::query()
            ->with(['supplier', 'warehouse', 'items'])
            ->where('organization_id', $user->organization_id)
            ->orderByDesc('id')
            ->paginate(20);

        return ApiResponse::success($paginator->items(), 'Purchase returns retrieved.');
    }

    public function store(StorePurchaseReturnRequest $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $user->organization_id === null) {
            return ApiResponse::error('Organization context required.', 'ORGANIZATION_REQUIRED', 422);
        }

        /** @var array{purchase_order_id: int, reason: string, items: list<array{product_variant_id: int, batch_id?: int|null, quantity: numeric-string|int|float, unit_cost: numeric-string|int|float}>} $validated */
        $validated = $request->validated();

        $return = DB::transaction(function () use ($user, $validated): PurchaseReturn {
            /** @var PurchaseOrder $po */
            $po = PurchaseOrder::query()
                ->where('organization_id', $user->organization_id)
                ->findOrFail($validated['purchase_order_id']);

            $record = PurchaseReturn::query()->create([
                'organization_id' => $user->organization_id,
                'purchase_order_id' => $po->id,
                'supplier_id' => $po->supplier_id,
                'warehouse_id' => $po->warehouse_id,
                'return_number' => 'PRET-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)),
                'reason' => $validated['reason'],
                'total_amount' => '0.00',
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            $total = Money::zero();
            foreach ($validated['items'] as $item) {
                $qtyStr = (string) $item['quantity'];
                $costMoney = Money::of((string) $item['unit_cost']);
                $lineTotal = $costMoney->multiply($qtyStr);

                PurchaseReturnItem::query()->create([
                    'purchase_return_id' => $record->id,
                    'product_variant_id' => $item['product_variant_id'],
                    'batch_id' => $item['batch_id'] ?? null,
                    'quantity' => $qtyStr,
                    'unit_cost' => $costMoney->toDecimal(),
                    'line_total' => $lineTotal->toDecimal(),
                ]);

                $total = $total->add($lineTotal);
            }

            $record->update(['total_amount' => $total->toDecimal()]);

            return $record->refresh()->load(['supplier', 'warehouse', 'items']);
        });

        return ApiResponse::success($return, 'Purchase return draft created.', 201);
    }

    public function confirm(
        Request $request,
        PurchaseReturn $return,
        ConfirmPurchaseReturnAction $action,
    ): JsonResponse {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('purchasing.approve') || $return->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $confirmed = $action->execute($return, $user->id);

        return ApiResponse::success($confirmed, 'Purchase return confirmed and credit note issued.');
    }
}
