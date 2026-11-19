<?php

declare(strict_types=1);

namespace App\Modules\Core\Domain\ValueObjects;

use InvalidArgumentException;

final readonly class Money
{
    public const int SCALE = 2;

    /** @var numeric-string */
    private string $amount;

    private function __construct(
        string $amount,
        private string $currency = 'IDR',
    ) {
        if (! is_numeric($amount)) {
            throw new InvalidArgumentException("Invalid monetary amount: {$amount}");
        }

        $this->amount = bcadd($amount, '0', self::SCALE);
    }

    public static function of(string|int $amount, string $currency = 'IDR'): self
    {
        return new self((string) $amount, strtoupper($currency));
    }

    public static function zero(string $currency = 'IDR'): self
    {
        return new self('0.00', strtoupper($currency));
    }

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self(bcadd($this->amount, $other->amount, self::SCALE), $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self(bcsub($this->amount, $other->amount, self::SCALE), $this->currency);
    }

    /**
     * Multiply monetary amount by a numeric quantity or factor with half-up rounding to 2 decimals.
     */
    public function multiply(string|int $multiplier): self
    {
        $factor = (string) $multiplier;
        if (! is_numeric($factor)) {
            throw new InvalidArgumentException("Invalid multiplier: {$factor}");
        }

        $raw = bcmul($this->amount, $factor, 6);

        return new self(self::roundHalfUp($raw, self::SCALE), $this->currency);
    }

    /**
     * Calculate percentage of this amount (e.g., rate '11.0000' for 11%).
     */
    public function percentage(string $rate): self
    {
        if (! is_numeric($rate)) {
            throw new InvalidArgumentException("Invalid percentage rate: {$rate}");
        }

        $raw = bcdiv(bcmul($this->amount, $rate, 6), '100', 6);

        return new self(self::roundHalfUp($raw, self::SCALE), $this->currency);
    }

    public function isNegative(): bool
    {
        return bccomp($this->amount, '0.00', self::SCALE) < 0;
    }

    public function isZero(): bool
    {
        return bccomp($this->amount, '0.00', self::SCALE) === 0;
    }

    public function isGreaterThanOrEqual(self $other): bool
    {
        $this->assertSameCurrency($other);

        return bccomp($this->amount, $other->amount, self::SCALE) >= 0;
    }

    public function equals(self $other): bool
    {
        return $this->currency === $other->currency
            && bccomp($this->amount, $other->amount, self::SCALE) === 0;
    }

    /**
     * @return numeric-string
     */
    public function toDecimal(): string
    {
        return $this->amount;
    }

    public function currency(): string
    {
        return $this->currency;
    }

    private function assertSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new InvalidArgumentException("Currency mismatch: {$this->currency} vs {$other->currency}");
        }
    }

    /**
     * @param  numeric-string  $value
     * @return numeric-string
     */
    private static function roundHalfUp(string $value, int $scale): string
    {
        $adjustment = '0.005';

        if (str_starts_with($value, '-')) {
            return bcsub($value, $adjustment, $scale);
        }

        return bcadd($value, $adjustment, $scale);
    }
}
