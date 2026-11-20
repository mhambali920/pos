<?php

declare(strict_types=1);

namespace App\Modules\Customer\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Customer\Models\Customer;
use App\Modules\Customer\Models\LoyaltyPointTransaction;
use App\Modules\Customer\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LoyaltyController extends Controller
{
    public function index(Request $request, Customer $customer): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('customers.view') || $customer->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        $ledger = LoyaltyPointTransaction::query()
            ->where('customer_id', $customer->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return ApiResponse::success([
            'customer_id' => $customer->id,
            'loyalty_points' => $customer->loyalty_points,
            'transactions' => $ledger,
        ], 'Customer loyalty ledger retrieved.');
    }

    public function adjust(Request $request, Customer $customer, LoyaltyService $loyalty): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('customers.update') || $customer->organization_id !== $user->organization_id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var array{type: string, points: int, notes: string} $validated */
        $validated = $request->validate([
            'type' => ['required', Rule::in(['earn', 'redeem', 'adjust'])],
            'points' => ['required', 'integer', 'not_in:0'],
            'notes' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        $tx = $loyalty->adjustPoints(
            customer: $customer,
            type: $validated['type'],
            points: (int) $validated['points'],
            notes: $validated['notes'],
            actorId: $user->id,
        );

        return ApiResponse::success($tx, 'Loyalty points updated.', 201);
    }
}
