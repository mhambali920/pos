<?php

declare(strict_types=1);

namespace App\Modules\Customer\Services;

use App\Modules\Customer\Models\Customer;
use App\Modules\Customer\Models\LoyaltyPointTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class LoyaltyService
{
    /**
     * Default earning rule: 1 point per 10,000 IDR spent.
     */
    public const int DEFAULT_AMOUNT_PER_POINT = 10000;

    /**
     * @param  numeric-string  $grandTotal
     */
    public function earnFromSale(int $customerId, int $saleId, string $grandTotal, ?int $actorId = null): ?LoyaltyPointTransaction
    {
        $points = (int) floor((float) $grandTotal / self::DEFAULT_AMOUNT_PER_POINT);
        if ($points <= 0) {
            return null;
        }

        return DB::transaction(function () use ($customerId, $saleId, $points, $actorId): ?LoyaltyPointTransaction {
            /** @var Customer|null $customer */
            $customer = Customer::query()->where('id', $customerId)->lockForUpdate()->first();
            if (! $customer instanceof Customer || $customer->customer_type === 'walk_in') {
                return null;
            }

            $newBalance = $customer->loyalty_points + $points;
            $customer->update(['loyalty_points' => $newBalance]);

            return LoyaltyPointTransaction::query()->create([
                'organization_id' => $customer->organization_id,
                'customer_id' => $customer->id,
                'sale_id' => $saleId,
                'type' => 'earn',
                'points' => $points,
                'balance_after' => $newBalance,
                'notes' => "Earned from sale #{$saleId}",
                'created_by' => $actorId,
                'created_at' => now(),
            ]);
        });
    }

    public function adjustPoints(
        Customer $customer,
        string $type,
        int $points,
        string $notes,
        ?int $actorId = null,
    ): LoyaltyPointTransaction {
        return DB::transaction(function () use ($customer, $type, $points, $notes, $actorId): LoyaltyPointTransaction {
            /** @var Customer $locked */
            $locked = Customer::query()->where('id', $customer->id)->lockForUpdate()->firstOrFail();

            $delta = $type === 'redeem' ? -abs($points) : $points;
            $newBalance = $locked->loyalty_points + $delta;

            if ($newBalance < 0) {
                throw ValidationException::withMessages([
                    'points' => ["Insufficient loyalty points. Available: {$locked->loyalty_points}."],
                ]);
            }

            $locked->update(['loyalty_points' => $newBalance]);

            return LoyaltyPointTransaction::query()->create([
                'organization_id' => $locked->organization_id,
                'customer_id' => $locked->id,
                'type' => $type,
                'points' => $delta,
                'balance_after' => $newBalance,
                'notes' => $notes,
                'created_by' => $actorId,
                'created_at' => now(),
            ]);
        });
    }
}
