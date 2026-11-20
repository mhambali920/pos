<?php

declare(strict_types=1);

namespace App\Modules\Sales\Domain\Exceptions;

use App\Modules\Core\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class InvalidRefundQuantityException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $saleItemId,
        public readonly string $remainingQty,
        public readonly string $requestedQty,
    ) {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return ApiResponse::error(
            message: $this->getMessage(),
            errorCode: 'INVALID_REFUND_QUANTITY',
            status: 422,
            errors: [
                'sale_item_id' => [(string) $this->saleItemId],
                'remaining_qty' => [$this->remainingQty],
                'requested_qty' => [$this->requestedQty],
            ],
        );
    }
}
