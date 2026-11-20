<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\CashManagement\Actions\AdjustClosedSessionAction;
use App\Modules\CashManagement\Actions\CloseCashRegisterAction;
use App\Modules\CashManagement\Actions\OpenCashRegisterAction;
use App\Modules\CashManagement\Actions\RecordCashMovementAction;
use App\Modules\CashManagement\Models\CashRegister;
use App\Modules\CashManagement\Models\CashRegisterSession;
use App\Modules\CashManagement\Services\CashReconciliationService;
use App\Modules\Core\Support\ApiResponse;
use App\Modules\Store\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CashRegisterController extends Controller
{
    /**
     * @var list<string>
     */
    private const array VIEW_PERMISSIONS = [
        'cash_register.open',
        'cash_register.close',
        'cash_register.cash_in',
        'cash_register.cash_out',
        'cash_register.adjust_closed',
        'sales.view',
    ];

    public function registers(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->canAny(self::VIEW_PERMISSIONS)) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        $registers = CashRegister::query()
            ->where('store_id', $store->id)
            ->orderBy('code')
            ->orderBy('id')
            ->get();

        return ApiResponse::success($registers, 'Cash registers retrieved.');
    }

    public function storeRegister(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('cash_register.open')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        /** @var array{code: string, name: string} $validated */
        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('cash_registers', 'code')->where('store_id', $store->id),
            ],
            'name' => ['required', 'string', 'max:150'],
        ]);

        $register = CashRegister::query()->create([
            'organization_id' => $store->organization_id,
            'store_id' => $store->id,
            'code' => Str::upper(trim($validated['code'])),
            'name' => trim($validated['name']),
            'is_active' => true,
        ]);

        return ApiResponse::success($register, 'Cash register created.', 201);
    }

    public function sessions(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->canAny(self::VIEW_PERMISSIONS)) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        $query = CashRegisterSession::query()
            ->with(['register', 'user', 'movements.creator'])
            ->where('store_id', $store->id);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->string('status'));
        }

        $paginator = $query->orderByDesc('opened_at')->orderByDesc('id')->paginate(20);

        return ApiResponse::success($paginator->items(), 'Cash register sessions retrieved.', 200, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function current(Request $request, CashReconciliationService $reconciliation): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        $session = CashRegisterSession::query()
            ->with(['register', 'user', 'movements.creator'])
            ->where('store_id', $store->id)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->orderByDesc('opened_at')
            ->orderByDesc('id')
            ->first();

        if (! $session instanceof CashRegisterSession) {
            return ApiResponse::success(null, 'No open cash register session.');
        }

        return ApiResponse::success([
            'session' => $session,
            'summary' => $reconciliation->summarize($session),
        ], 'Current cash register session retrieved.');
    }

    public function open(Request $request, OpenCashRegisterAction $action, CashReconciliationService $reconciliation): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('cash_register.open')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        /** @var array{cash_register_id: int, opening_balance: numeric-string} $validated */
        $validated = $request->validate([
            'cash_register_id' => [
                'required',
                'integer',
                Rule::exists('cash_registers', 'id')->where('store_id', $store->id),
            ],
            'opening_balance' => ['required', 'numeric', 'min:0'],
        ]);

        $session = $action->execute(
            store: $store,
            cashRegisterId: (int) $validated['cash_register_id'],
            userId: $user->id,
            openingBalance: (string) $validated['opening_balance'],
        );

        return ApiResponse::success([
            'session' => $session,
            'summary' => $reconciliation->summarize($session),
        ], 'Cash register session opened.', 201);
    }

    public function cashIn(Request $request, RecordCashMovementAction $action, CashReconciliationService $reconciliation): JsonResponse
    {
        return $this->handleMovement($request, 'cash_in', 'cash_register.cash_in', $action, $reconciliation);
    }

    public function cashOut(Request $request, RecordCashMovementAction $action, CashReconciliationService $reconciliation): JsonResponse
    {
        return $this->handleMovement($request, 'cash_out', 'cash_register.cash_out', $action, $reconciliation);
    }

    public function close(Request $request, CloseCashRegisterAction $action, CashReconciliationService $reconciliation): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can('cash_register.close')) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        /** @var array{session_id?: int|null, actual_cash: numeric-string, closing_notes?: string|null} $validated */
        $validated = $request->validate([
            'session_id' => [
                'nullable',
                'integer',
                Rule::exists('cash_register_sessions', 'id')->where('store_id', $store->id),
            ],
            'actual_cash' => ['required', 'numeric', 'min:0'],
            'closing_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $session = $this->resolveTargetSession($store, $user, $validated['session_id'] ?? null);
        if (! $session instanceof CashRegisterSession) {
            return ApiResponse::error('No open cash register session found.', 'NO_OPEN_SESSION', 422);
        }

        $closed = $action->execute(
            session: $session,
            actualCash: (string) $validated['actual_cash'],
            closingNotes: $validated['closing_notes'] ?? null,
            actorId: $user->id,
        );

        return ApiResponse::success([
            'session' => $closed,
            'summary' => $reconciliation->summarize($closed),
        ], 'Cash register session closed.');
    }

    public function adjustClosed(
        Request $request,
        CashRegisterSession $session,
        AdjustClosedSessionAction $action,
        CashReconciliationService $reconciliation,
    ): JsonResponse {
        $user = $request->user();
        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        if (! $user instanceof User || ! $user->can('cash_register.adjust_closed') || $session->store_id !== $store->id) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var array{amount: numeric-string, reason: string} $validated */
        $validated = $request->validate([
            'amount' => ['required', 'numeric'],
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        $adjusted = $action->execute(
            session: $session,
            adjustmentAmount: (string) $validated['amount'],
            reason: $validated['reason'],
            actorId: $user->id,
        );

        return ApiResponse::success([
            'session' => $adjusted,
            'summary' => $reconciliation->summarize($adjusted),
        ], 'Closed cash register session adjusted.');
    }

    private function handleMovement(
        Request $request,
        string $type,
        string $permission,
        RecordCashMovementAction $action,
        CashReconciliationService $reconciliation,
    ): JsonResponse {
        $user = $request->user();
        if (! $user instanceof User || ! $user->can($permission)) {
            return ApiResponse::error('Forbidden.', 'FORBIDDEN', 403);
        }

        /** @var Store $store */
        $store = $request->attributes->get('active_store');

        /** @var array{session_id?: int|null, amount: numeric-string, reason: string} $validated */
        $validated = $request->validate([
            'session_id' => [
                'nullable',
                'integer',
                Rule::exists('cash_register_sessions', 'id')->where('store_id', $store->id),
            ],
            'amount' => ['required', 'numeric', 'gt:0'],
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        $session = $this->resolveTargetSession($store, $user, $validated['session_id'] ?? null);
        if (! $session instanceof CashRegisterSession) {
            return ApiResponse::error('No cash register session found.', 'NO_OPEN_SESSION', 422);
        }

        $movement = $action->execute(
            session: $session,
            type: $type,
            amount: (string) $validated['amount'],
            reason: $validated['reason'],
            actorId: $user->id,
        );

        return ApiResponse::success([
            'movement' => $movement,
            'summary' => $reconciliation->summarize($session->refresh()),
        ], 'Cash movement recorded.', 201);
    }

    private function resolveTargetSession(
        Store $store,
        User $user,
        ?int $sessionId,
    ): ?CashRegisterSession {
        if ($sessionId !== null) {
            return CashRegisterSession::query()
                ->where('id', $sessionId)
                ->where('store_id', $store->id)
                ->first();
        }

        return CashRegisterSession::query()
            ->where('store_id', $store->id)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->orderByDesc('opened_at')
            ->orderByDesc('id')
            ->first();
    }
}
