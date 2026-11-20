<?php

declare(strict_types=1);

namespace App\Modules\POS\Actions;

use App\Modules\Payment\Contracts\PaymentGatewayContract;
use App\Modules\Payment\Models\PaymentMethod;
use App\Modules\Sales\Models\Payment;
use App\Modules\Sales\Models\Sale;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class RecordPosPaymentAction
{
    public function __construct(
        private PaymentGatewayContract $gateway,
    ) {}

    /**
     * Record one or more payments (supports split payment) with server-side gateway verification.
     *
     * @param  list<array<string, mixed>>  $paymentsInput
     * @return list<Payment>
     */
    public function execute(Sale $sale, array $paymentsInput, int $actorId): array
    {
        return DB::transaction(function () use ($sale, $paymentsInput, $actorId): array {
            /** @var Sale $lockedSale */
            $lockedSale = Sale::query()->where('id', $sale->id)->lockForUpdate()->firstOrFail();

            if (! in_array($lockedSale->status, ['pending_payment', 'draft'], true)) {
                throw ValidationException::withMessages([
                    'status' => ["Cannot record payment for sale in status '{$lockedSale->status}'."],
                ]);
            }

            $recorded = [];

            foreach ($paymentsInput as $index => $entry) {
                /** @var PaymentMethod $method */
                $method = PaymentMethod::query()
                    ->where('organization_id', $lockedSale->organization_id)
                    ->where('is_active', true)
                    ->findOrFail($entry['payment_method_id']);

                $amountRaw = is_scalar($entry['amount']) ? (string) $entry['amount'] : '0';
                $amount = bcadd(is_numeric($amountRaw) ? $amountRaw : '0', '0', 2);

                $tenderedRaw = isset($entry['tendered_amount']) && is_scalar($entry['tendered_amount'])
                    ? (string) $entry['tendered_amount']
                    : $amount;
                $tendered = bcadd(is_numeric($tenderedRaw) ? $tenderedRaw : $amount, '0', 2);

                $change = '0.00';
                if ($method->type === 'cash') {
                    if (bccomp($tendered, $amount, 2) < 0) {
                        throw ValidationException::withMessages([
                            "payments.{$index}.tendered_amount" => ['Cash tendered amount cannot be less than payment amount.'],
                        ]);
                    }
                    $change = bcsub($tendered, $amount, 2);
                }

                $extRef = is_string($entry['external_reference'] ?? null) ? $entry['external_reference'] : null;
                /** @var array<string, mixed> $meta */
                $meta = is_array($entry['metadata'] ?? null) ? $entry['metadata'] : [];

                $verification = $this->gateway->verify($method, $amount, $extRef, $meta);

                $payment = Payment::query()->create([
                    'organization_id' => $lockedSale->organization_id,
                    'store_id' => $lockedSale->store_id,
                    'sale_id' => $lockedSale->id,
                    'payment_method_id' => $method->id,
                    'amount' => $amount,
                    'tendered_amount' => $tendered,
                    'change_amount' => $change,
                    'status' => $verification->status,
                    'external_reference' => $verification->externalReference,
                    'gateway_payload' => $verification->gatewayPayload,
                    'paid_at' => $verification->verified ? now() : null,
                    'created_by' => $actorId,
                ]);

                if (! $verification->verified) {
                    throw ValidationException::withMessages([
                        "payments.{$index}" => [$verification->failureMessage ?? 'Payment verification failed.'],
                    ]);
                }

                $recorded[] = $payment->load('method');
            }

            return $recorded;
        });
    }
}
