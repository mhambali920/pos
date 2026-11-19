<?php

declare(strict_types=1);

namespace App\Modules\Tax\Tests\Unit;

use App\Modules\Core\Domain\ValueObjects\Money;
use App\Modules\Tax\Services\TaxCalculator;
use PHPUnit\Framework\TestCase;

class TaxCalculatorTest extends TestCase
{
    public function test_exclusive_tax_calculation(): void
    {
        $calculator = new TaxCalculator;
        $result = $calculator->calculate(Money::of('100000.00'), '11.0000', 'exclusive');

        $this->assertSame('100000.00', $result['taxable_amount']->toDecimal());
        $this->assertSame('11000.00', $result['tax_amount']->toDecimal());
        $this->assertSame('111000.00', $result['total_amount']->toDecimal());
    }

    public function test_inclusive_tax_calculation(): void
    {
        $calculator = new TaxCalculator;
        $result = $calculator->calculate(Money::of('111000.00'), '11.0000', 'inclusive');

        $this->assertSame('100000.00', $result['taxable_amount']->toDecimal());
        $this->assertSame('11000.00', $result['tax_amount']->toDecimal());
        $this->assertSame('111000.00', $result['total_amount']->toDecimal());
    }

    public function test_zero_rate_tax(): void
    {
        $calculator = new TaxCalculator;
        $result = $calculator->calculate(Money::of('50000.00'), '0.0000', 'exclusive');

        $this->assertSame('50000.00', $result['taxable_amount']->toDecimal());
        $this->assertSame('0.00', $result['tax_amount']->toDecimal());
        $this->assertSame('50000.00', $result['total_amount']->toDecimal());
    }
}
