<?php

declare(strict_types=1);

namespace App\Modules\Core\Http\Middleware;

use App\Models\User;
use App\Modules\Core\Models\IdempotencyKey;
use App\Modules\Core\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        $key = $request->header('Idempotency-Key');
        if (! is_string($key) || trim($key) === '') {
            return ApiResponse::error(
                'Idempotency-Key header is required for this operation.',
                'IDEMPOTENCY_KEY_REQUIRED',
                400,
            );
        }

        $requestPath = $request->method().':'.$request->path();
        $requestHash = hash('sha256', (string) $request->getContent());

        $existing = IdempotencyKey::query()
            ->where('user_id', $user->id)
            ->where('key', $key)
            ->where('request_path', $requestPath)
            ->where('expires_at', '>', now())
            ->first();

        if ($existing instanceof IdempotencyKey) {
            if (! hash_equals($existing->request_hash, $requestHash)) {
                return ApiResponse::error(
                    'Idempotency-Key was already used with a different request payload.',
                    'IDEMPOTENCY_KEY_CONFLICT',
                    422,
                );
            }

            return response($existing->response_body, $existing->response_status)
                ->header('Content-Type', 'application/json')
                ->header('X-Idempotency-Replayed', 'true');
        }

        /** @var Response $response */
        $response = $next($request);

        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            IdempotencyKey::query()->create([
                'organization_id' => $user->organization_id,
                'user_id' => $user->id,
                'key' => $key,
                'request_path' => $requestPath,
                'request_hash' => $requestHash,
                'response_status' => $response->getStatusCode(),
                'response_body' => (string) $response->getContent(),
                'expires_at' => now()->addHours(24),
            ]);
        }

        return $response;
    }
}
