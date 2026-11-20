<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Actions;

use App\Modules\AuditLog\Contracts\AuditLoggerContract;
use App\Modules\CashManagement\Models\CashRegister;
use App\Modules\CashManagement\Models\CashRegisterSession;
use App\Modules\Store\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final readonly class OpenCashRegisterAction
{
    public function __construct(
        private AuditLoggerContract $auditLogger,
    ) {}

    /**
     * @param  numeric-string  $openingBalance
     */
    public function execute(Store $store, int $cashRegisterId, int $userId, string $openingBalance): CashRegisterSession
    {
        return DB::transaction(function () use ($store, $cashRegisterId, $userId, $openingBalance): CashRegisterSession {
            /** @var CashRegister|null $register */
            $register = CashRegister::query()
                ->where('id', $cashRegisterId)
                ->where('store_id', $store->id)
                ->where('is_active', true)
                ->lockForUpdate()
                ->first();

            if (! $register instanceof CashRegister) {
                throw ValidationException::withMessages([
                    'cash_register_id' => ['Selected cash register is not active or does not belong to this store.'],
                ]);
            }

            $registerOpen = CashRegisterSession::query()
                ->where('cash_register_id', $register->id)
                ->where('status', 'open')
                ->exists();

            if ($registerOpen) {
                throw ValidationException::withMessages([
                    'cash_register_id' => ['This cash register already has an open session.'],
                ]);
            }

            $userOpen = CashRegisterSession::query()
                ->where('store_id', $store->id)
                ->where('user_id', $userId)
                ->where('status', 'open')
                ->exists();

            if ($userOpen) {
                throw ValidationException::withMessages([
                    'user_id' => ['You already have an open cash register session in this store.'],
                ]);
            }

            /** @var numeric-string $normalizedOpening */
            $normalizedOpening = bcadd($openingBalance, '0', 2);

            $session = CashRegisterSession::query()->create([
                'organization_id' => $store->organization_id,
                'store_id' => $store->id,
                'cash_register_id' => $register->id,
                'user_id' => $userId,
                'opened_at' => now(),
                'opening_balance' => $normalizedOpening,
                'expected_cash' => $normalizedOpening,
                'status' => 'open',
            ]);

            $this->auditLogger->log(
                module: 'CashManagement',
                action: 'cash_register.opened',
                entityType: CashRegisterSession::class,
                entityId: $session->id,
                newValues: [
                    'cash_register_id' => $register->id,
                    'opening_balance' => $normalizedOpening,
                ],
                organizationId: $store->organization_id,
                storeId: $store->id,
                userId: $userId,
            );

            return $session->load(['register', 'user', 'movements']);
        });
    }
}
