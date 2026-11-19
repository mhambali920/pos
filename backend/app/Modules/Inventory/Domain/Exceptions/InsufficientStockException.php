<?php

declare(strict_types=1);

namespace App\Modules\Inventory\Domain\Exceptions;

use App\Modules\Core\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class InsufficientStockException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $productVariantId,
        public readonly string $availableQty,
        public readonly string $requestedQty,
    ) {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return ApiResponse::error(
            message: $this->getMessage(),
            errorCode: 'INSUFFICIENT_STOCK',
            status: 422,
            errors: [
                'product_variant_id' => [(string) $this->productVariantId],
                'available_qty' => [$this->availableQty],
                'requested_qty' => [$this->requestedQty],
            ],
        );
    }
}
