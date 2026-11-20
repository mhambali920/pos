<?php

declare(strict_types=1);

namespace App\Modules\Sales\Services;

use App\Modules\Sales\Models\Payment;
use App\Modules\Sales\Models\Sale;
use App\Modules\Sales\Models\SaleItem;

final readonly class ReceiptService
{
    /**
     * Build structured receipt payload + formatted thermal text (58mm = 32 chars, 80mm = 48 chars).
     *
     * @return array<string, mixed>
     */
    public function build(Sale $sale, string $paperSize = '80mm'): array
    {
        $sale->loadMissing(['store', 'cashier', 'customer', 'items', 'payments.method']);

        $width = $paperSize === '58mm' ? 32 : 48;
        $divider = str_repeat('-', $width);

        $lines = [
            $this->center($sale->store->name ?? 'Enterprise POS', $width),
            $this->center($sale->store->address ?? '', $width),
            $divider,
            "No   : {$sale->transaction_number}",
            'Date : '.($sale->completed_at ?? $sale->created_at)?->format('Y-m-d H:i:s'),
            'Cashier : '.($sale->cashier->name ?? 'Staff'),
            'Customer: '.($sale->customer->name ?? 'Walk-in'),
            $divider,
        ];

        $itemsData = [];
        foreach ($sale->items as $item) {
            /** @var SaleItem $item */
            $lines[] = $item->product_name_snapshot;
            $qtyFormatted = rtrim(rtrim($item->quantity, '0'), '.');
            $lines[] = $this->lr("  {$qtyFormatted} x {$item->unit_price_snapshot}", $item->line_total, $width);

            $itemsData[] = [
                'sku' => $item->sku_snapshot,
                'name' => $item->product_name_snapshot,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price_snapshot,
                'discount' => $item->discount_amount,
                'tax' => $item->tax_amount,
                'line_total' => $item->line_total,
            ];
        }

        $lines[] = $divider;
        $lines[] = $this->lr('Subtotal', $sale->subtotal, $width);
        $lines[] = $this->lr('Discount', $sale->discount_total, $width);
        $lines[] = $this->lr('Tax', $sale->tax_total, $width);
        $lines[] = $this->lr('GRAND TOTAL', $sale->grand_total, $width);
        $lines[] = $divider;

        $paymentsData = [];
        foreach ($sale->payments->where('status', 'confirmed') as $payment) {
            /** @var Payment $payment */
            $methodName = $payment->method->name ?? 'Payment';
            $lines[] = $this->lr($methodName, $payment->amount, $width);
            $paymentsData[] = [
                'method' => $methodName,
                'type' => $payment->method->type ?? 'cash',
                'amount' => $payment->amount,
                'tendered_amount' => $payment->tendered_amount,
                'change_amount' => $payment->change_amount,
            ];
        }

        $lines[] = $this->lr('Paid', $sale->paid_total, $width);
        $lines[] = $this->lr('Change', $sale->change_amount, $width);
        $lines[] = $divider;
        $lines[] = $this->center('Thank you for your purchase!', $width);

        return [
            'paper_size' => $paperSize === '58mm' ? '58mm' : '80mm',
            'store' => [
                'code' => $sale->store?->code,
                'name' => $sale->store?->name,
                'address' => $sale->store?->address,
                'phone' => $sale->store?->phone,
            ],
            'transaction_number' => $sale->transaction_number,
            'status' => $sale->status,
            'completed_at' => $sale->completed_at?->toIso8601String(),
            'cashier' => $sale->cashier?->name,
            'customer' => $sale->customer !== null ? $sale->customer->name : 'Walk-in Customer',
            'items' => $itemsData,
            'subtotal' => $sale->subtotal,
            'discount_total' => $sale->discount_total,
            'tax_total' => $sale->tax_total,
            'grand_total' => $sale->grand_total,
            'payments' => $paymentsData,
            'paid_total' => $sale->paid_total,
            'change_amount' => $sale->change_amount,
            'thank_you_message' => 'Thank you for your purchase!',
            'thermal_text' => implode("\n", array_filter($lines, static fn (string $l): bool => $l !== '')),
        ];
    }

    private function center(string $text, int $width): string
    {
        if ($text === '') {
            return '';
        }

        $len = mb_strlen($text);
        if ($len >= $width) {
            return mb_substr($text, 0, $width);
        }

        $pad = (int) floor(($width - $len) / 2);

        return str_repeat(' ', $pad).$text;
    }

    private function lr(string $left, string $right, int $width): string
    {
        $space = max(1, $width - mb_strlen($left) - mb_strlen($right));

        return $left.str_repeat(' ', $space).$right;
    }
}
