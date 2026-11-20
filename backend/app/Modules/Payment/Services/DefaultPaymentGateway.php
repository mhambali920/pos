<?php

declare(strict_types=1);

namespace App\Modules\Payment\Services;

use App\Modules\Payment\Contracts\PaymentGatewayContract;
use App\Modules\Payment\Data\PaymentVerificationResult;
use App\Modules\Payment\Models\PaymentMethod;

final class DefaultPaymentGateway implements PaymentGatewayContract
{
    /**
     * @param  numeric-string  $amount
     * @param  array<string, mixed>  $metadata
     */
    public function verify(
        PaymentMethod $method,
        string $amount,
        ?string $externalReference = null,
        array $metadata = [],
    ): PaymentVerificationResult {
        if ($method->type === 'cash') {
            return new PaymentVerificationResult(
                verified: true,
                status: 'confirmed',
                externalReference: $externalReference,
                gatewayPayload: ['driver' => 'cash', 'verified_at' => now()->toIso8601String()],
            );
        }

        if (($metadata['simulate_failure'] ?? false) === true) {
            return new PaymentVerificationResult(
                verified: false,
                status: 'failed',
                externalReference: $externalReference,
                failureMessage: 'Payment gateway declined the transaction.',
                gatewayPayload: ['driver' => $method->gateway_driver ?? 'default', 'declined' => true],
            );
        }

        return new PaymentVerificationResult(
            verified: true,
            status: 'confirmed',
            externalReference: $externalReference,
            gatewayPayload: [
                'driver' => $method->gateway_driver ?? 'manual_edc',
                'amount' => $amount,
                'verified_at' => now()->toIso8601String(),
            ],
        );
    }
}
