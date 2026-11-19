<?php

declare(strict_types=1);

namespace App\Modules\Core\Http\Middleware;

use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Store\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Symfony\Component\HttpFoundation\Response;

class EnsureStoreAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        $storeIdHeader = $request->header('X-Store-Id');
        if (! is_string($storeIdHeader) || $storeIdHeader === '' || ! ctype_digit($storeIdHeader)) {
            return ApiResponse::error(
                'Header X-Store-Id is required and must be a valid store ID.',
                'STORE_CONTEXT_REQUIRED',
                400,
            );
        }

        $storeId = (int) $storeIdHeader;
        $store = Store::query()
            ->where('id', $storeId)
            ->where('organization_id', $user->organization_id)
            ->first();

        if (! $store instanceof Store) {
            return ApiResponse::error(
                'Store not found or outside your organization.',
                'STORE_FORBIDDEN',
                403,
            );
        }

        if (! $user->canAccessStore($store->id)) {
            return ApiResponse::error(
                'You do not have permission to access this store.',
                'STORE_FORBIDDEN',
                403,
            );
        }

        $request->attributes->set('active_store_id', $store->id);
        $request->attributes->set('active_store', $store);
        Context::add('store_id', $store->id);
        Context::add('organization_id', $user->organization_id);

        return $next($request);
    }
}
