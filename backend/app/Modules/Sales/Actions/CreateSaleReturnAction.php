<?php

declare(strict_types=1);

namespace App\Modules\Sales\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\CashManagement\Models\CashRegisterSession;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Payment\Models\PaymentMethod;
use App\Modules\Product\Domain\Enums\ProductType;
use App\Modules\Sales\Domain\Exceptions\InvalidRefundQuantityException;
use App\Modules\Sales\Models\Sale;
use App\Modules\Sales\Models\SaleItem;
use App\Modules\Sales\Models\SaleReturn;
use App\Modules\Sales\Models\SaleReturnItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final readonly class CreateSaleReturnAction
{
    public function __construct(
        private InventoryLedgerContract $ledger,
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array{
     *     reason: string,
     *     type?: string,
     *     refund_method_id?: int|null,
     *     cash_register_session_id?: int|null,
     *     exchange_sale_id?: int|null,
     *     items: list<array{sale_item_id: int, quantity: numeric-string, condition?: string}>
     * }  $data
     */
    public function execute(Sale $sale, array $data, int $actorId): SaleReturn
    {
        return DB::transaction(function () use ($sale, $data, $actorId): SaleReturn {
            /** @var Sale $lockedSale */
            $lockedSale = Sale::query()->where('id', $sale->id)->lockForUpdate()->firstOrFail();

            if (! in_array($lockedSale->status, ['paid', 'partially_refunded'], true)) {
                throw ValidationException::withMessages([
                    'status' => ["Sale in status '{$lockedSale->status}' cannot be returned or refunded."],
                ]);
            }

            $refundMethod = null;
            if (isset($data['refund_method_id'])) {
                $refundMethod = PaymentMethod::query()
                    ->where('organization_id', $lockedSale->organization_id)
                    ->where('id', $data['refund_method_id'])
                    ->first();

                if (! $refundMethod instanceof PaymentMethod) {
                    throw ValidationException::withMessages([
                        'refund_method_id' => ['Invalid refund payment method.'],
                    ]);
                }
            }

            $sessionId = $data['cash_register_session_id'] ?? null;
            if ($sessionId === null && $refundMethod instanceof PaymentMethod && $refundMethod->type === 'cash') {
                $openSession = CashRegisterSession::query()
                    ->where('store_id', $lockedSale->store_id)
                    ->where('user_id', $actorId)
                    ->where('status', 'open')
                    ->orderByDesc('opened_at')
                    ->orderByDesc('id')
                    ->first();

                $sessionId = $openSession instanceof CashRegisterSession
                    ? $openSession->id
                    : $lockedSale->cash_register_session_id;
            }

            $saleItems = $lockedSale->items()
                ->with(['variant.product', 'variant.bundleComponents'])
                ->get()
                ->keyBy('id');

            // Accumulate previously returned quantities per sale_item_id
            $alreadyReturnedMap = [];
            $existingReturnItems = SaleReturnItem::query()
                ->whereIn('sale_item_id', $saleItems->keys())
                ->get(['sale_item_id', 'quantity']);

            foreach ($existingReturnItems as $retItem) {
                $prev = $alreadyReturnedMap[$retItem->sale_item_id] ?? '0.0000';
                $alreadyReturnedMap[$retItem->sale_item_id] = bcadd($prev, $retItem->quantity, 4);
            }

            // Validate all requested items first (prevents duplicate sale_item_id bypass within same request)
            $requestedTotals = [];
            $preparedLines = [];
            $totalRefundAmount = '0.00';

            foreach ($data['items'] as $index => $line) {
                $saleItemId = (int) $line['sale_item_id'];
                /** @var SaleItem|null $saleItem */
                $saleItem = $saleItems->get($saleItemId);

                if (! $saleItem instanceof SaleItem) {
                    throw ValidationException::withMessages([
                        "items.{$index}.sale_item_id" => ['Sale item does not belong to this transaction.'],
                    ]);
                }

                /** @var numeric-string $reqQty */
                $reqQty = bcadd((string) $line['quantity'], '0', 4);
                if (bccomp($reqQty, '0.0000', 4) <= 0) {
                    throw new InvalidRefundQuantityException(
                        message: 'Refund quantity must be greater than zero.',
                        saleItemId: $saleItemId,
                        remainingQty: bcsub($saleItem->quantity, $alreadyReturnedMap[$saleItemId] ?? '0.0000', 4),
                        requestedQty: $reqQty,
                    );
                }

                $alreadyReturned = $alreadyReturnedMap[$saleItemId] ?? '0.0000';
                $runningRequest = bcadd($requestedTotals[$saleItemId] ?? '0.0000', $reqQty, 4);
                $remainingQty = bcsub($saleItem->quantity, $alreadyReturned, 4);

                // BR-002 & CS-04: Cumulative return quantity cannot exceed purchased quantity!
                if (bccomp($runningRequest, $remainingQty, 4) > 0) {
                    throw new InvalidRefundQuantityException(
                        message: "Refund quantity ({$runningRequest}) exceeds remaining refundable quantity ({$remainingQty}) for {$saleItem->sku_snapshot}.",
                        saleItemId: $saleItemId,
                        remainingQty: $remainingQty,
                        requestedQty: $runningRequest,
                    );
                }

                $requestedTotals[$saleItemId] = $runningRequest;

                // Proportional refund from immutable sale_item snapshot (multiply first, then divide to avoid truncation loss)
                $lineRefundSubtotal = bcdiv(bcmul($saleItem->line_total, $reqQty, 6), $saleItem->quantity, 2);
                $lineRefundTax = bcdiv(bcmul($saleItem->tax_amount, $reqQty, 6), $saleItem->quantity, 2);
                $totalRefundAmount = bcadd($totalRefundAmount, $lineRefundSubtotal, 2);

                $condition = ($line['condition'] ?? 'resellable') === 'damaged' ? 'damaged' : 'resellable';

                $preparedLines[] = [
                    'sale_item' => $saleItem,
                    'quantity' => $reqQty,
                    'unit_price' => $saleItem->unit_price_snapshot,
                    'tax_amount' => $lineRefundTax,
                    'refund_subtotal' => $lineRefundSubtotal,
                    'condition' => $condition,
                ];
            }

            $saleReturn = SaleReturn::query()->create([
                'organization_id' => $lockedSale->organization_id,
                'store_id' => $lockedSale->store_id,
                'warehouse_id' => $lockedSale->warehouse_id,
                'sale_id' => $lockedSale->id,
                'cash_register_session_id' => $sessionId,
                'return_number' => 'RET-'.now()->format('YmdHis').'-'.strtoupper(Str::random(4)),
                'type' => ($data['type'] ?? 'refund') === 'exchange' ? 'exchange' : 'refund',
                'reason' => $data['reason'],
                'refund_amount' => $totalRefundAmount,
                'refund_method_id' => $refundMethod?->id,
                'exchange_sale_id' => $data['exchange_sale_id'] ?? null,
                'status' => 'completed',
                'approved_by' => $actorId,
                'created_by' => $actorId,
            ]);

            foreach ($preparedLines as $prepared) {
                /** @var SaleItem $saleItem */
                $saleItem = $prepared['sale_item'];

                SaleReturnItem::query()->create([
                    'sale_return_id' => $saleReturn->id,
                    'sale_item_id' => $saleItem->id,
                    'product_variant_id' => $saleItem->product_variant_id,
                    'quantity' => $prepared['quantity'],
                    'unit_price' => $prepared['unit_price'],
                    'tax_amount' => $prepared['tax_amount'],
                    'refund_subtotal' => $prepared['refund_subtotal'],
                    'condition' => $prepared['condition'],
                ]);

                // Return stock only if item condition is resellable and product tracks inventory
                if ($prepared['condition'] !== 'resellable') {
                    continue;
                }

                $product = $saleItem->variant?->product;
                if ($product === null || ! $product->track_inventory) {
                    continue;
                }

                if ($product->product_type === ProductType::Bundle) {
                    foreach ($saleItem->variant->bundleComponents->sortBy('component_variant_id') as $component) {
                        /** @var numeric-string $compQty */
                        $compQty = bcadd($component->quantity, '0', 4);
                        $returnQty = bcmul($compQty, $prepared['quantity'], 4);

                        $this->ledger->mutate(new StockMutationData(
                            organizationId: $lockedSale->organization_id,
                            warehouseId: $lockedSale->warehouse_id,
                            productVariantId: $component->component_variant_id,
                            movementType: StockMovementType::SaleReturn,
                            qtyChange: $returnQty,
                            referenceType: SaleReturn::class,
                            referenceId: $saleReturn->id,
                            notes: "Sale return {$saleReturn->return_number} (bundle)",
                            actorId: $actorId,
                        ));
                    }

                    continue;
                }

                $this->ledger->mutate(new StockMutationData(
                    organizationId: $lockedSale->organization_id,
                    warehouseId: $lockedSale->warehouse_id,
                    productVariantId: $saleItem->product_variant_id,
                    movementType: StockMovementType::SaleReturn,
                    qtyChange: $prepared['quantity'],
                    referenceType: SaleReturn::class,
                    referenceId: $saleReturn->id,
                    unitCost: $saleItem->cost_price_snapshot,
                    notes: "Sale return {$saleReturn->return_number}",
                    actorId: $actorId,
                ));
            }

            // Determine whether the entire sale has now been refunded
            $allFullyReturned = true;
            foreach ($saleItems as $saleItem) {
                $totalReturnedForItem = bcadd(
                    $alreadyReturnedMap[$saleItem->id] ?? '0.0000',
                    $requestedTotals[$saleItem->id] ?? '0.0000',
                    4,
                );

                if (bccomp($totalReturnedForItem, $saleItem->quantity, 4) < 0) {
                    $allFullyReturned = false;
                    break;
                }
            }

            $newSaleStatus = $allFullyReturned ? 'refunded' : 'partially_refunded';
            $lockedSale->update(['status' => $newSaleStatus]);

            $this->auditLogger->log(
                module: 'Sales',
                action: 'sales.returned',
                entityType: SaleReturn::class,
                entityId: $saleReturn->id,
                newValues: [
                    'return_number' => $saleReturn->return_number,
                    'sale_id' => $lockedSale->id,
                    'transaction_number' => $lockedSale->transaction_number,
                    'refund_amount' => $totalRefundAmount,
                    'new_sale_status' => $newSaleStatus,
                    'reason' => $data['reason'],
                ],
                organizationId: $lockedSale->organization_id,
                storeId: $lockedSale->store_id,
                userId: $actorId,
            );

            return $saleReturn->load(['items.saleItem', 'refundMethod', 'sale', 'creator']);
        });
    }
}
