<?php

declare(strict_types=1);

namespace App\Modules\Core\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AttachRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        $incoming = $request->header('X-Request-Id');
        $requestId = is_string($incoming) && $incoming !== ''
            ? $incoming
            : 'req_'.Str::ulid()->toBase32();

        $request->attributes->set('request_id', $requestId);
        Context::add('request_id', $requestId);

        /** @var Response $response */
        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
