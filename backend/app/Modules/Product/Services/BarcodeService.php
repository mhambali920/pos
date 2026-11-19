<?php

declare(strict_types=1);

namespace App\Modules\Product\Services;

use App\Modules\Product\Models\ProductBarcode;
use App\Modules\Product\Models\ProductVariant;

final readonly class BarcodeService
{
    public function findVariantByBarcode(int $organizationId, string $barcode): ?ProductVariant
    {
        $record = ProductBarcode::query()
            ->with([
                'variant.product.category',
                'variant.product.brand',
                'variant.product.baseUnit',
                'variant.product.tax',
                'variant.barcodes',
            ])
            ->where('organization_id', $organizationId)
            ->where('barcode', $barcode)
            ->first();

        return $record?->variant;
    }

    /**
     * Generate a valid internal EAN-13 barcode (prefix 200 for in-store / internal retail use).
     */
    public function generateEan13(int $organizationId, int $variantId): string
    {
        $orgPart = str_pad((string) ($organizationId % 1000), 3, '0', STR_PAD_LEFT);
        $varPart = str_pad((string) ($variantId % 1000000), 6, '0', STR_PAD_LEFT);
        $base12 = '200'.$orgPart.$varPart;

        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $digit = (int) $base12[$i];
            $sum += ($i % 2 === 0) ? $digit : $digit * 3;
        }

        $checkDigit = (10 - ($sum % 10)) % 10;

        return $base12.$checkDigit;
    }
}
