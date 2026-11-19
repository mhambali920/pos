<?php

declare(strict_types=1);

namespace App\Modules\Purchasing\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\Purchasing\Models\PurchaseInvoice;
use App\Modules\Purchasing\Models\PurchasePayment;
use App\Modules\Supplier\Models\Supplier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final readonly class RecordPurchasePaymentAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(PurchaseInvoice $invoice, int $actorId, array $data): PurchasePayment
    {
        return DB::transaction(function () use ($invoice, $actorId, $data): PurchasePayment {
            /** @var PurchaseInvoice $lockedInvoice */
            $lockedInvoice = PurchaseInvoice::query()->where('id', $invoice->id)->lockForUpdate()->firstOrFail();

            if ($lockedInvoice->payment_status === 'paid') {
                throw ValidationException::withMessages([
                    'amount' => ['This purchase invoice is already fully paid.'],
                ]);
            }

            $amountRaw = is_scalar($data['amount']) ? (string) $data['amount'] : '0';
            $amount = bcadd(is_numeric($amountRaw) ? $amountRaw : '0', '0', 2);
            $outstanding = bcsub($lockedInvoice->grand_total, $lockedInvoice->paid_amount, 2);

            if (bccomp($amount, $outstanding, 2) > 0) {
                throw ValidationException::withMessages([
                    'amount' => ["Payment amount ({$amount}) exceeds outstanding balance ({$outstanding})."],
                ]);
            }

            $payment = PurchasePayment::query()->create([
                'organization_id' => $lockedInvoice->organization_id,
                'purchase_invoice_id' => $lockedInvoice->id,
                'payment_number' => 'PPAY-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)),
                'payment_method' => $data['payment_method'],
                'amount' => $amount,
                'paid_at' => $data['paid_at'] ?? now(),
                'reference_no' => $data['reference_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $actorId,
            ]);

            $newPaid = bcadd($lockedInvoice->paid_amount, $amount, 2);
            $nextStatus = bccomp($newPaid, $lockedInvoice->grand_total, 2) >= 0 ? 'paid' : 'partially_paid';

            $lockedInvoice->update([
                'paid_amount' => $newPaid,
                'payment_status' => $nextStatus,
            ]);

            /** @var Supplier $supplier */
            $supplier = Supplier::query()->where('id', $lockedInvoice->supplier_id)->lockForUpdate()->firstOrFail();
            $supplier->update([
                'balance' => bcsub($supplier->balance, $amount, 2),
            ]);

            $this->auditLogger->log(
                module: 'Purchasing',
                action: 'purchase_payment.recorded',
                entityType: PurchasePayment::class,
                entityId: $payment->id,
                newValues: [
                    'payment_number' => $payment->payment_number,
                    'amount' => $amount,
                    'invoice_status' => $nextStatus,
                ],
                organizationId: $lockedInvoice->organization_id,
                userId: $actorId,
            );

            return $payment->load('invoice');
        });
    }
}
