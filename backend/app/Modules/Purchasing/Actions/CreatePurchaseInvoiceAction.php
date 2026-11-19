<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Purchasing\Models\PurchaseInvoice;
use App\Modules\Purchasing\Models\PurchaseOrder;
use App\Modules\Supplier\Models\Supplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class CreatePurchaseInvoiceAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(int $organizationId, int $actorId, array $data): PurchaseInvoice
    {
        return DB::transaction(function () use ($organizationId, $actorId, $data): PurchaseInvoice {
            /** @var PurchaseOrder $po */
            $po = PurchaseOrder::query()
                ->where('organization_id', $organizationId)
                ->findOrFail($data['purchase_order_id']);

            /** @var Supplier $supplier */
            $supplier = Supplier::query()->where('id', $po->supplier_id)->lockForUpdate()->firstOrFail();

            $grandTotalStr = is_scalar($data['grand_total'] ?? null)
                ? (string) $data['grand_total']
                : $po->grand_total;
            $grandTotal = bcadd(is_numeric($grandTotalStr) ? $grandTotalStr : '0', '0', 2);

            $invoice = PurchaseInvoice::query()->create([
                'organization_id' => $organizationId,
                'purchase_order_id' => $po->id,
                'supplier_id' => $supplier->id,
                'invoice_number' => 'PINV-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)),
                'supplier_invoice_number' => $data['supplier_invoice_number'] ?? null,
                'invoice_date' => $data['invoice_date'] ?? now()->toDateString(),
                'due_date' => $data['due_date'] ?? now()->addDays($supplier->payment_terms_days)->toDateString(),
                'grand_total' => $grandTotal,
                'paid_amount' => '0.00',
                'payment_status' => 'unpaid',
                'created_by' => $actorId,
            ]);

            $supplier->update([
                'balance' => bcadd($supplier->balance, $grandTotal, 2),
            ]);

            $this->auditLogger->log(
                module: 'Purchasing',
                action: 'purchase_invoice.created',
                entityType: PurchaseInvoice::class,
                entityId: $invoice->id,
                newValues: ['invoice_number' => $invoice->invoice_number, 'grand_total' => $grandTotal],
                organizationId: $organizationId,
                userId: $actorId,
            );

            return $invoice->load(['supplier', 'purchaseOrder', 'payments']);
        });
    }
}
