<?php

declare(strict_types=1);

namespace App\Modules\Product\Domain\Enums;

enum ProductType: string
{
    case Standard = 'standard';
    case Variant = 'variant';
    case Bundle = 'bundle';
    case Service = 'service';
    case NonStock = 'non_stock';

    public function tracksInventoryByDefault(): bool
    {
        return match ($this) {
            self::Service, self::NonStock => false,
            default => true,
        };
    }
}
