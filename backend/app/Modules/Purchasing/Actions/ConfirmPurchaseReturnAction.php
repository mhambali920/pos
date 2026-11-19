<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Inventory\Contracts\InventoryLedgerContract;
use App\Modules\Inventory\Data\StockMutationData;
use App\Modules\Inventory\Domain\Enums\StockMovementType;
use App\Modules\Purchasing\Models\PurchaseReturn;
use App\Modules\Supplier\Models\Supplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final readonly class ConfirmPurchaseReturnAction
{
    public function __construct(
        private InventoryLedgerContract $ledger,
        private AuditLoggerContract $auditLogger,
    ) {}

    public function execute(PurchaseReturn $return, int $actorId): PurchaseReturn
    {
        return DB::transaction(function () use ($return, $actorId): PurchaseReturn {
            /** @var PurchaseReturn $locked */
            $locked = PurchaseReturn::query()->where('id', $return->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'draft') {
                throw ValidationException::withMessages([
                    'status' => ['Only draft purchase returns can be confirmed.'],
                ]);
            }

            $items = $locked->items()->orderBy('product_variant_id')->get();
            foreach ($items as $item) {
                $negativeQty = bcmul($item->quantity, '-1', 4);

                $this->ledger->mutate(new StockMutationData(
                    organizationId: $locked->organization_id,
                    warehouseId: $locked->warehouse_id,
                    productVariantId: $item->product_variant_id,
                    movementType: StockMovementType::PurchaseReturn,
                    qtyChange: $negativeQty,
                    referenceType: PurchaseReturn::class,
                    referenceId: $locked->id,
                    batchId: $item->batch_id,
                    notes: "Purchase return {$locked->return_number}: {$locked->reason}",
                    actorId: $actorId,
                ));
            }

            $creditNoteNo = $locked->credit_note_no ?? 'CN-'.now()->format('Ymd').'-'.strtoupper(Str::random(6));

            $locked->update([
                'status' => 'confirmed',
                'credit_note_no' => $creditNoteNo,
                'confirmed_by' => $actorId,
                'confirmed_at' => now(),
            ]);

            /** @var Supplier $supplier */
            $supplier = Supplier::query()->where('id', $locked->supplier_id)->lockForUpdate()->firstOrFail();
            $supplier->update([
                'balance' => bcsub($supplier->balance, $locked->total_amount, 2),
            ]);

            $this->auditLogger->log(
                module: 'Purchasing',
                action: 'purchase_return.confirmed',
                entityType: PurchaseReturn::class,
                entityId: $locked->id,
                newValues: [
                    'return_number' => $locked->return_number,
                    'credit_note_no' => $creditNoteNo,
                    'total_amount' => $locked->total_amount,
                ],
                organizationId: $locked->organization_id,
                userId: $actorId,
            );

            return $locked->refresh()->load(['supplier', 'warehouse', 'items']);
        });
    }
}
