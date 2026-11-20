<?php

declare(strict_types=1);

namespace App\Modules\Payment\Data;

final readonly class PaymentVerificationResult
{
    /**
     * @param  array<string, mixed>  $gatewayPayload
     */
    public function __construct(
        public bool $verified,
        public string $status,
        public ?string $externalReference = null,
        public ?string $failureMessage = null,
        public array $gatewayPayload = [],
    ) {}
}
