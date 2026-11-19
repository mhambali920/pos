<?php

declare(strict_types=1);

use App\Modules\Core\Http\Middleware\AttachRequestId;
use App\Modules\Core\Http\Middleware\EnforceIdempotency;
use App\Modules\Core\Http\Middleware\EnsureStoreAccess;
use App\Modules\Core\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->appendToGroup('api', [
            AttachRequestId::class,
        ]);

        $middleware->alias([
            'store.access' => EnsureStoreAccess::class,
            'idempotent' => EnforceIdempotency::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request): bool => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    message: $e->getMessage(),
                    errorCode: 'VALIDATION_ERROR',
                    status: 422,
                    errors: $e->errors(),
                );
            }

            return null;
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
            }

            return null;
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error('This action is unauthorized.', 'FORBIDDEN', 403);
            }

            return null;
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error('Resource not found.', 'NOT_FOUND', 404);
            }

            return null;
        });
    })->create();
