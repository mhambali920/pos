<?php

declare(strict_types=1);

namespace App\Modules\POS\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Product\Domain\Enums\ProductType;
use App\Modules\Sales\Models\Payment;
use App\Modules\Sales\Models\Sale;
use App\Modules\Store\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class CompletePosCheckoutAction
{
    public function __construct(
        private InventoryLedgerContract $ledger,
        private AuditLoggerContract $auditLogger,
    ) {}

    public function execute(Sale $sale, Store $store, int $actorId): Sale
    {
        return DB::transaction(function () use ($sale, $store, $actorId): Sale {
            /** @var Sale $lockedSale */
            $lockedSale = Sale::query()->where('id', $sale->id)->lockForUpdate()->firstOrFail();

            if ($lockedSale->status === 'paid') {
                return $lockedSale->load(['items', 'payments.method', 'customer', 'cashier', 'store']);
            }

            if ($lockedSale->status !== 'pending_payment') {
                throw ValidationException::withMessages([
                    'status' => ["Sale in status '{$lockedSale->status}' cannot be completed."],
                ]);
            }

            $confirmedPayments = Payment::query()
                ->where('sale_id', $lockedSale->id)
                ->where('status', 'confirmed')
                ->get();

            $paidTotal = '0.00';
            $changeTotal = '0.00';
            foreach ($confirmedPayments as $payment) {
                $paidTotal = bcadd($paidTotal, $payment->amount, 2);
                $changeTotal = bcadd($changeTotal, $payment->change_amount, 2);
            }

            // CS-05: Split/single payment must cover grand_total!
            if (bccomp($paidTotal, $lockedSale->grand_total, 2) < 0) {
                throw ValidationException::withMessages([
                    'payments' => [
                        "Insufficient payment. Paid: {$paidTotal}, required: {$lockedSale->grand_total}.",
                    ],
                ]);
            }

            // Deduct stock atomically in deterministic product_variant_id ASC order (prevents deadlocks!)
            $items = $lockedSale->items()
                ->with(['variant.product', 'variant.bundleComponents'])
                ->orderBy('product_variant_id')
                ->get();

            foreach ($items as $item) {
                $product = $item->variant?->product;
                if ($product === null || ! $product->track_inventory) {
                    continue;
                }

                if ($product->product_type === ProductType::Bundle) {
                    foreach ($item->variant->bundleComponents->sortBy('component_variant_id') as $component) {
                        /** @var numeric-string $compQty */
                        $compQty = bcadd($component->quantity, '0', 4);
                        $deductQty = bcmul(bcmul($compQty, $item->quantity, 4), '-1', 4);

                        $this->ledger->mutate(new StockMutationData(
                            organizationId: $lockedSale->organization_id,
                            warehouseId: $lockedSale->warehouse_id,
                            productVariantId: $component->component_variant_id,
                            movementType: StockMovementType::SaleOut,
                            qtyChange: $deductQty,
                            referenceType: Sale::class,
                            referenceId: $lockedSale->id,
                            notes: "POS bundle sale {$lockedSale->transaction_number}",
                            actorId: $actorId,
                            allowNegativeStock: $store->allow_negative_stock,
                        ));
                    }

                    continue;
                }

                $deductQty = bcmul($item->quantity, '-1', 4);

                $this->ledger->mutate(new StockMutationData(
                    organizationId: $lockedSale->organization_id,
                    warehouseId: $lockedSale->warehouse_id,
                    productVariantId: $item->product_variant_id,
                    movementType: StockMovementType::SaleOut,
                    qtyChange: $deductQty,
                    referenceType: Sale::class,
                    referenceId: $lockedSale->id,
                    notes: "POS sale {$lockedSale->transaction_number}",
                    actorId: $actorId,
                    allowNegativeStock: $store->allow_negative_stock,
                ));
            }

            $lockedSale->update([
                'status' => 'paid',
                'paid_total' => $paidTotal,
                'change_amount' => $changeTotal,
                'completed_at' => now(),
            ]);

            $this->auditLogger->log(
                module: 'POS',
                action: 'pos.checkout_completed',
                entityType: Sale::class,
                entityId: $lockedSale->id,
                newValues: [
                    'transaction_number' => $lockedSale->transaction_number,
                    'grand_total' => $lockedSale->grand_total,
                    'paid_total' => $paidTotal,
                ],
                organizationId: $lockedSale->organization_id,
                storeId: $lockedSale->store_id,
                userId: $actorId,
            );

            return $lockedSale->refresh()->load(['items', 'payments.method', 'customer', 'cashier', 'store']);
        });
    }
}
