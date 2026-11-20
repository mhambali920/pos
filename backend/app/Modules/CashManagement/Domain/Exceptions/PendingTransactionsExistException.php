<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Domain\Exceptions;

use App\Modules\Core\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class PendingTransactionsExistException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $pendingCount,
    ) {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return ApiResponse::error(
            message: $this->getMessage(),
            errorCode: 'PENDING_TRANSACTIONS_EXIST',
            status: 422,
            errors: [
                'pending_transactions' => ["{$this->pendingCount} pending transaction(s) must be completed, held, or cancelled before closing the register."],
            ],
        );
    }
}
