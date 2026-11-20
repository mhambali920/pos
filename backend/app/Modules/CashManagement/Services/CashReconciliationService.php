<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Services;

use App\Modules\CashManagement\Models\CashRegisterMovement;
use App\Modules\CashManagement\Models\CashRegisterSession;
use App\Modules\Sales\Models\Payment;
use Illuminate\Support\Facades\DB;

final class CashReconciliationService
{
    /**
     * Pure formula from BUSINESS_RULES.md Section 2.C:
     * expected_cash = opening_balance + cash_sales + cash_in - cash_out - cash_refund - cash_expense + cash_adjustment
     *
     * @param  numeric-string  $openingBalance
     * @param  numeric-string  $cashSales
     * @param  numeric-string  $cashIn
     * @param  numeric-string  $cashOut
     * @param  numeric-string  $cashRefund
     * @param  numeric-string  $cashExpense
     * @param  numeric-string  $cashAdjustment
     * @return numeric-string
     */
    public function computeExpectedCash(
        string $openingBalance,
        string $cashSales,
        string $cashIn,
        string $cashOut,
        string $cashRefund,
        string $cashExpense,
        string $cashAdjustment = '0.00',
    ): string {
        $total = bcadd($openingBalance, $cashSales, 2);
        $total = bcadd($total, $cashIn, 2);
        $total = bcsub($total, $cashOut, 2);
        $total = bcsub($total, $cashRefund, 2);
        $total = bcsub($total, $cashExpense, 2);

        return bcadd($total, $cashAdjustment, 2);
    }

    /**
     * @return array{
     *     opening_balance: numeric-string,
     *     cash_sales: numeric-string,
     *     cash_in: numeric-string,
     *     cash_out: numeric-string,
     *     cash_refund: numeric-string,
     *     cash_expense: numeric-string,
     *     cash_adjustment: numeric-string,
     *     expected_cash: numeric-string,
     *     actual_cash: numeric-string|null,
     *     cash_difference: numeric-string|null,
     *     reconciliation_status: string
     * }
     */
    public function summarize(CashRegisterSession $session): array
    {
        /** @var numeric-string $openingBalance */
        $openingBalance = bcadd($session->opening_balance, '0', 2);

        $cashSales = $this->sumCashSales($session->id);
        $cashRefund = $this->sumCashRefunds($session->id);

        $movements = CashRegisterMovement::query()
            ->where('session_id', $session->id)
            ->get(['type', 'amount']);

        $cashIn = '0.00';
        $cashOut = '0.00';
        $cashExpense = '0.00';
        $cashAdjustment = '0.00';

        foreach ($movements as $movement) {
            /** @var numeric-string $amt */
            $amt = bcadd($movement->amount, '0', 2);
            match ($movement->type) {
                'cash_in' => $cashIn = bcadd($cashIn, $amt, 2),
                'cash_out' => $cashOut = bcadd($cashOut, $amt, 2),
                'cash_expense' => $cashExpense = bcadd($cashExpense, $amt, 2),
                'cash_adjustment' => $cashAdjustment = bcadd($cashAdjustment, $amt, 2),
                default => null,
            };
        }

        $expectedCash = $this->computeExpectedCash(
            openingBalance: $openingBalance,
            cashSales: $cashSales,
            cashIn: $cashIn,
            cashOut: $cashOut,
            cashRefund: $cashRefund,
            cashExpense: $cashExpense,
            cashAdjustment: $cashAdjustment,
        );

        $actualCash = $session->actual_cash !== null ? bcadd($session->actual_cash, '0', 2) : null;
        $cashDifference = $actualCash !== null ? bcsub($actualCash, $expectedCash, 2) : null;

        $reconciliationStatus = 'open';
        if ($cashDifference !== null) {
            $cmp = bccomp($cashDifference, '0.00', 2);
            $reconciliationStatus = match (true) {
                $cmp === 0 => 'balanced',
                $cmp > 0 => 'overage',
                default => 'shortage',
            };
        }

        return [
            'opening_balance' => $openingBalance,
            'cash_sales' => $cashSales,
            'cash_in' => $cashIn,
            'cash_out' => $cashOut,
            'cash_refund' => $cashRefund,
            'cash_expense' => $cashExpense,
            'cash_adjustment' => $cashAdjustment,
            'expected_cash' => $expectedCash,
            'actual_cash' => $actualCash,
            'cash_difference' => $cashDifference,
            'reconciliation_status' => $reconciliationStatus,
        ];
    }

    /**
     * @return numeric-string
     */
    private function sumCashSales(int $sessionId): string
    {
        $payments = Payment::query()
            ->join('sales', 'sales.id', '=', 'payments.sale_id')
            ->join('payment_methods', 'payment_methods.id', '=', 'payments.payment_method_id')
            ->where('sales.cash_register_session_id', $sessionId)
            ->whereIn('sales.status', ['paid', 'partially_refunded', 'refunded'])
            ->where('payments.status', 'confirmed')
            ->where('payment_methods.type', 'cash')
            ->pluck('payments.amount');

        $total = '0.00';
        foreach ($payments as $amount) {
            $total = bcadd($total, $this->toNumericString($amount), 2);
        }

        return $total;
    }

    /**
     * @return numeric-string
     */
    private function sumCashRefunds(int $sessionId): string
    {
        $refunds = DB::table('sale_returns')
            ->join('payment_methods', 'payment_methods.id', '=', 'sale_returns.refund_method_id')
            ->where('sale_returns.cash_register_session_id', $sessionId)
            ->where('sale_returns.status', 'completed')
            ->where('payment_methods.type', 'cash')
            ->pluck('sale_returns.refund_amount');

        $total = '0.00';
        foreach ($refunds as $amount) {
            $total = bcadd($total, $this->toNumericString($amount), 2);
        }

        return $total;
    }

    /**
     * @return numeric-string
     */
    private function toNumericString(mixed $value): string
    {
        if (is_int($value)) {
            return (string) $value;
        }

        if (is_string($value) && is_numeric($value)) {
            return $value;
        }

        if (is_float($value) && is_finite($value)) {
            return number_format($value, 2, '.', '');
        }

        return '0.00';
    }
}
