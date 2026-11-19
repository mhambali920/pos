<?php

declare(strict_types=1);

namespace App\Modules\Core\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;

final class ApiResponse
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public static function success(
        mixed $data = null,
        string $message = 'Operation completed successfully.',
        int $status = 200,
        array $meta = [],
    ): JsonResponse {
        $resolvedData = $data;

        if ($data instanceof JsonResource) {
            $resolvedData = $data->resolve(request());
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $resolvedData,
            'meta' => array_merge([
                'request_id' => self::requestId(),
            ], $meta),
        ], $status);
    }

    /**
     * @param  LengthAwarePaginator<int, mixed>  $paginator
     */
    public static function paginated(
        LengthAwarePaginator $paginator,
        ResourceCollection $collection,
        string $message = 'Data retrieved successfully.',
    ): JsonResponse {
        return self::success(
            data: $collection->resolve(request()),
            message: $message,
            status: 200,
            meta: [
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                ],
            ],
        );
    }

    /**
     * @param  array<string, mixed>|null  $errors
     */
    public static function error(
        string $message,
        string $errorCode = 'ERROR',
        int $status = 400,
        ?array $errors = null,
    ): JsonResponse {
        $payload = [
            'success' => false,
            'message' => $message,
            'error_code' => $errorCode,
            'meta' => [
                'request_id' => self::requestId(),
            ],
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }

    public static function requestId(): string
    {
        $requestId = request()->attributes->get('request_id');

        return is_string($requestId) && $requestId !== '' ? $requestId : 'req_unknown';
    }
}
