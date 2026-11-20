<?php

declare(strict_types=1);

namespace App\Modules\Payment\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Payment\Models\PaymentMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return ApiResponse::error('Unauthenticated.', 'UNAUTHENTICATED', 401);
        }

        $methods = PaymentMethod::query()
            ->where('organization_id', $user->organization_id)
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        return ApiResponse::success($methods);
    }
}
