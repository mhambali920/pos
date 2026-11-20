<?php

declare(strict_types=1);

namespace App\Modules\Payment\Contracts;

use App\Modules\Payment\Data\PaymentVerificationResult;
use App\Modules\Payment\Models\PaymentMethod;

interface PaymentGatewayContract
{
    /**
     * Server-side payment verification (never trust frontend callback alone — BR-010).
     *
     * @param  numeric-string  $amount
     * @param  array<string, mixed>  $metadata
     */
    public function verify(
        PaymentMethod $method,
        string $amount,
        ?string $externalReference = null,
        array $metadata = [],
    ): PaymentVerificationResult;
}
