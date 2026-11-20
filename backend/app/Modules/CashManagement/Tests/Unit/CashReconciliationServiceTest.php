<?php

declare(strict_types=1);

namespace App\Modules\CashManagement\Tests\Unit;

use App\Modules\CashManagement\Services\CashReconciliationService;
use PHPUnit\Framework\TestCase;

class CashReconciliationServiceTest extends TestCase
{
    public function test_it_computes_expected_cash_with_decimal_precision(): void
    {
        $service = new CashReconciliationService;

        $expected = $service->computeExpectedCash(
            openingBalance: '500000.00',
            cashSales: '1250500.50',
            cashIn: '100000.00',
            cashOut: '200000.25',
            cashRefund: '50000.10',
            cashExpense: '35000.15',
            cashAdjustment: '0.00',
        );

        // 500000 + 1250500.50 + 100000 - 200000.25 - 50000.10 - 35000.15 = 1565500.00
        $this->assertSame('1565500.00', $expected);
    }

    public function test_it_includes_post_close_cash_adjustment(): void
    {
        $service = new CashReconciliationService;

        $expected = $service->computeExpectedCash(
            openingBalance: '100000.00',
            cashSales: '50000.00',
            cashIn: '0.00',
            cashOut: '0.00',
            cashRefund: '0.00',
            cashExpense: '0.00',
            cashAdjustment: '-15000.00',
        );

        $this->assertSame('135000.00', $expected);
    }
}
