<?php

declare(strict_types=1);

namespace App\Modules\Tax\Services;

use App\Modules\Core\Domain\ValueObjects\Money;

final readonly class TaxCalculator
{
    /**
     * @param  numeric-string  $rate
     * @return array{taxable_amount: Money, tax_amount: Money, total_amount: Money}
     */
    public function calculate(Money $amountAfterDiscount, string $rate, string $type): array
    {
        if (bccomp($rate, '0.0000', 4) <= 0) {
            return [
                'taxable_amount' => $amountAfterDiscount,
                'tax_amount' => Money::zero($amountAfterDiscount->currency()),
                'total_amount' => $amountAfterDiscount,
            ];
        }

        if ($type === 'inclusive') {
            $divisor = bcadd('1', bcdiv($rate, '100', 6), 6);
            $rawTaxable = bcdiv($amountAfterDiscount->toDecimal(), $divisor, 6);
            $roundedTaxable = bcadd($rawTaxable, '0.005', 2);
            $taxable = Money::of($roundedTaxable, $amountAfterDiscount->currency());
            $taxAmount = $amountAfterDiscount->subtract($taxable);

            return [
                'taxable_amount' => $taxable,
                'tax_amount' => $taxAmount,
                'total_amount' => $amountAfterDiscount,
            ];
        }

        $taxAmount = $amountAfterDiscount->percentage($rate);

        return [
            'taxable_amount' => $amountAfterDiscount,
            'tax_amount' => $taxAmount,
            'total_amount' => $amountAfterDiscount->add($taxAmount),
        ];
    }
}
