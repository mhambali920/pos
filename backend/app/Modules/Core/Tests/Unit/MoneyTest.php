<?php

declare(strict_types=1);

namespace App\Modules\Core\Tests\Unit;

use App\Modules\Core\Domain\ValueObjects\Money;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_decimal_addition_and_subtraction_without_float_drift(): void
    {
        $a = Money::of('0.10');
        $b = Money::of('0.20');

        $this->assertSame('0.30', $a->add($b)->toDecimal());
        $this->assertSame('0.10', $b->subtract($a)->toDecimal());
    }

    public function test_multiply_and_percentage_calculations(): void
    {
        $unitPrice = Money::of('15000.00');
        $subtotal = $unitPrice->multiply('3');
        $tax = $subtotal->percentage('11.0000');

        $this->assertSame('45000.00', $subtotal->toDecimal());
        $this->assertSame('4950.00', $tax->toDecimal());
        $this->assertSame('49950.00', $subtotal->add($tax)->toDecimal());
    }

    public function test_currency_mismatch_throws_exception(): void
    {
        $this->expectException(InvalidArgumentException::class);

        Money::of('1000', 'IDR')->add(Money::of('10', 'USD'));
    }
}
