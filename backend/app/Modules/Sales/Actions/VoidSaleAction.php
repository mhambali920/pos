<?php

declare(strict_types=1);

namespace App\Modules\Sales\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Sales\Models\Sale;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class VoidSaleAction
{
    public function __construct(
        private InventoryLedgerContract $ledger,
        private AuditLoggerContract $auditLogger,
    ) {}

    public function execute(Sale $sale, string $reason, int $actorId): Sale
    {
        return DB::transaction(function () use ($sale, $reason, $actorId): Sale {
            /** @var Sale $locked */
            $locked = Sale::query()->where('id', $sale->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'status' => ['Transaction is already cancelled.'],
                ]);
            }

            $wasPaid = $locked->status === 'paid';

            if ($wasPaid) {
                $items = $locked->items()->with('variant.product')->orderBy('product_variant_id')->get();

                foreach ($items as $item) {
                    if ($item->variant?->product?->track_inventory === true) {
                        $this->ledger->mutate(new StockMutationData(
                            organizationId: $locked->organization_id,
                            warehouseId: $locked->warehouse_id,
                            productVariantId: $item->product_variant_id,
                            movementType: StockMovementType::SaleReturn,
                            qtyChange: $item->quantity,
                            referenceType: Sale::class,
                            referenceId: $locked->id,
                            unitCost: $item->cost_price_snapshot,
                            notes: "Void sale {$locked->transaction_number}: {$reason}",
                            actorId: $actorId,
                        ));
                    }
                }
            }

            $oldStatus = $locked->status;
            $locked->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancelled_by' => $actorId,
                'cancellation_reason' => $reason,
            ]);

            $this->auditLogger->log(
                module: 'Sales',
                action: 'sale.voided',
                entityType: Sale::class,
                entityId: $locked->id,
                oldValues: ['status' => $oldStatus],
                newValues: ['status' => 'cancelled', 'reason' => $reason, 'restored_stock' => $wasPaid],
                organizationId: $locked->organization_id,
                storeId: $locked->store_id,
                userId: $actorId,
            );

            return $locked->refresh()->load(['items', 'payments.method', 'customer', 'cashier']);
        });
    }
}
