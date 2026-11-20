<?php

declare(strict_types=1);

namespace App\Modules\FinancialReporting\Services;

use App\Models\User;
use App\Modules\Expense\Models\Expense;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Purchasing\Models\PurchaseInvoice;
use App\Modules\Purchasing\Models\PurchaseOrder;
use App\Modules\Sales\Models\Payment;
use App\Modules\Sales\Models\Sale;
use App\Modules\Sales\Models\SaleItem;
use App\Modules\Sales\Models\SaleReturn;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class ReportingService
{
    /**
     * @param  array{date_from?: string|null, date_to?: string|null, store_id?: int|null}  $filters
     * @return array<string, mixed>
     */
    public function generate(User $user, string $type, array $filters): array
    {
        $from = isset($filters['date_from']) && $filters['date_from'] !== ''
            ? Carbon::parse($filters['date_from'])->startOfDay()
            : now()->subDays(29)->startOfDay();
        $to = isset($filters['date_to']) && $filters['date_to'] !== ''
            ? Carbon::parse($filters['date_to'])->endOfDay()
            : now()->endOfDay();

        $storeIds = $this->resolveStoreIds($user, $filters['store_id'] ?? null);

        return match ($type) {
            'sales' => $this->salesReport($user->organization_id, $storeIds, $from, $to),
            'inventory' => $this->inventoryReport($user->organization_id, $storeIds),
            'purchasing' => $this->purchasingReport($user->organization_id, $from, $to),
            'financial' => $this->financialReport($user->organization_id, $storeIds, $from, $to),
            default => [],
        };
    }

    /**
     * @param  list<int>  $storeIds
     * @return array<string, mixed>
     */
    private function salesReport(int $orgId, array $storeIds, Carbon $from, Carbon $to): array
    {
        $sales = Sale::query()
            ->where('organization_id', $orgId)
            ->whereIn('store_id', $storeIds)
            ->whereIn('status', ['paid', 'partially_refunded', 'refunded'])
            ->whereBetween('completed_at', [$from, $to])
            ->orderByDesc('completed_at')
            ->orderByDesc('id')
            ->get(['id', 'transaction_number', 'subtotal', 'discount_total', 'tax_total', 'grand_total', 'status', 'completed_at']);

        $grossSales = '0.00';
        $discounts = '0.00';
        $taxes = '0.00';
        $rows = [];

        foreach ($sales as $sale) {
            $grossSales = bcadd($grossSales, $sale->grand_total, 2);
            $discounts = bcadd($discounts, $sale->discount_total, 2);
            $taxes = bcadd($taxes, $sale->tax_total, 2);
            $rows[] = [
                'transaction_number' => $sale->transaction_number,
                'date' => $sale->completed_at?->toDateString() ?? '',
                'status' => $sale->status,
                'subtotal' => $sale->subtotal,
                'discount_total' => $sale->discount_total,
                'tax_total' => $sale->tax_total,
                'grand_total' => $sale->grand_total,
            ];
        }

        $saleIds = $sales->pluck('id')->all();
        $paymentBreakdown = [];
        if ($saleIds !== []) {
            $payments = Payment::query()
                ->with('method')
                ->whereIn('sale_id', $saleIds)
                ->where('status', 'confirmed')
                ->get();

            foreach ($payments as $p) {
                $name = $p->method->name ?? 'Unknown';
                $paymentBreakdown[$name] = bcadd($paymentBreakdown[$name] ?? '0.00', $p->amount, 2);
            }
        }

        return [
            'report_type' => 'sales',
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => [
                'transaction_count' => $sales->count(),
                'gross_sales' => $grossSales,
                'discount_total' => $discounts,
                'tax_total' => $taxes,
            ],
            'payment_breakdown' => $paymentBreakdown,
            'rows' => $rows,
        ];
    }

    /**
     * @param  list<int>  $storeIds
     * @return array<string, mixed>
     */
    private function inventoryReport(int $orgId, array $storeIds): array
    {
        $stocks = InventoryStock::query()
            ->with(['warehouse', 'variant.product'])
            ->where('organization_id', $orgId)
            ->whereHas('warehouse', static function ($q) use ($storeIds): void {
                $q->whereIn('store_id', $storeIds)->orWhereNull('store_id');
            })
            ->orderBy('id')
            ->get();

        $totalValuation = '0.00';
        $totalQty = '0.0000';
        $lowStockCount = 0;
        $rows = [];

        foreach ($stocks as $stock) {
            $valuation = bcmul($stock->qty_on_hand, $stock->unit_cost, 2);
            $totalValuation = bcadd($totalValuation, $valuation, 2);
            $totalQty = bcadd($totalQty, $stock->qty_on_hand, 4);

            $rawReorder = $stock->variant->reorder_point ?? '0.0000';
            $reorderPoint = is_numeric($rawReorder) ? $rawReorder : '0.0000';
            $isLow = bccomp($stock->qty_on_hand, $reorderPoint, 4) <= 0;
            if ($isLow) {
                $lowStockCount++;
            }

            $rows[] = [
                'warehouse' => $stock->warehouse->name ?? '',
                'sku' => $stock->variant->sku ?? '',
                'product_name' => $stock->variant->product->name ?? ($stock->variant->name ?? ''),
                'qty_on_hand' => $stock->qty_on_hand,
                'unit_cost' => $stock->unit_cost,
                'valuation' => $valuation,
                'low_stock' => $isLow,
            ];
        }

        return [
            'report_type' => 'inventory',
            'summary' => [
                'sku_rows' => $stocks->count(),
                'total_qty' => $totalQty,
                'total_valuation' => $totalValuation,
                'low_stock_count' => $lowStockCount,
            ],
            'rows' => $rows,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function purchasingReport(int $orgId, Carbon $from, Carbon $to): array
    {
        $orders = PurchaseOrder::query()
            ->with('supplier')
            ->where('organization_id', $orgId)
            ->whereDate('order_date', '>=', $from->toDateString())
            ->whereDate('order_date', '<=', $to->toDateString())
            ->orderByDesc('order_date')
            ->orderByDesc('id')
            ->get();

        $totalPo = '0.00';
        $rows = [];
        foreach ($orders as $po) {
            $totalPo = bcadd($totalPo, $po->grand_total, 2);
            $rows[] = [
                'po_number' => $po->po_number,
                'order_date' => $po->order_date->toDateString(),
                'supplier' => $po->supplier->company_name ?? '',
                'status' => $po->status,
                'grand_total' => $po->grand_total,
            ];
        }

        $invoices = PurchaseInvoice::query()
            ->where('organization_id', $orgId)
            ->get(['grand_total', 'paid_amount', 'payment_status']);

        $unpaidTotal = '0.00';
        foreach ($invoices as $inv) {
            $outstanding = bcsub($inv->grand_total, $inv->paid_amount, 2);
            if (bccomp($outstanding, '0.00', 2) > 0) {
                $unpaidTotal = bcadd($unpaidTotal, $outstanding, 2);
            }
        }

        return [
            'report_type' => 'purchasing',
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => [
                'po_count' => $orders->count(),
                'po_total' => $totalPo,
                'outstanding_payables' => $unpaidTotal,
            ],
            'rows' => $rows,
        ];
    }

    /**
     * @param  list<int>  $storeIds
     * @return array<string, mixed>
     */
    private function financialReport(int $orgId, array $storeIds, Carbon $from, Carbon $to): array
    {
        $sales = Sale::query()
            ->where('organization_id', $orgId)
            ->whereIn('store_id', $storeIds)
            ->whereIn('status', ['paid', 'partially_refunded', 'refunded'])
            ->whereBetween('completed_at', [$from, $to])
            ->get(['id', 'grand_total']);

        $grossSales = '0.00';
        foreach ($sales as $s) {
            $grossSales = bcadd($grossSales, $s->grand_total, 2);
        }

        $returns = SaleReturn::query()
            ->where('organization_id', $orgId)
            ->whereIn('store_id', $storeIds)
            ->where('status', 'completed')
            ->whereBetween('created_at', [$from, $to])
            ->get(['refund_amount']);

        $salesReturns = '0.00';
        foreach ($returns as $r) {
            $salesReturns = bcadd($salesReturns, $r->refund_amount, 2);
        }

        $netSales = bcsub($grossSales, $salesReturns, 2);

        $saleIds = $sales->pluck('id')->all();
        $cogs = '0.00';
        if ($saleIds !== []) {
            $items = SaleItem::query()->whereIn('sale_id', $saleIds)->get(['quantity', 'cost_price_snapshot']);
            foreach ($items as $item) {
                $cogs = bcadd($cogs, bcmul($item->cost_price_snapshot, $item->quantity, 2), 2);
            }
        }

        $grossProfit = bcsub($netSales, $cogs, 2);

        $expenses = Expense::query()
            ->with('category')
            ->where('organization_id', $orgId)
            ->whereIn('store_id', $storeIds)
            ->where('status', 'approved')
            ->whereDate('expense_date', '>=', $from->toDateString())
            ->whereDate('expense_date', '<=', $to->toDateString())
            ->get();

        $operatingExpenses = '0.00';
        $expenseByCategory = [];
        foreach ($expenses as $exp) {
            $operatingExpenses = bcadd($operatingExpenses, $exp->amount, 2);
            $catName = $exp->category->name ?? 'General';
            $expenseByCategory[$catName] = bcadd($expenseByCategory[$catName] ?? '0.00', $exp->amount, 2);
        }

        $netProfit = bcsub($grossProfit, $operatingExpenses, 2);

        return [
            'report_type' => 'financial',
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => [
                'gross_sales' => $grossSales,
                'sales_returns' => $salesReturns,
                'net_sales' => $netSales,
                'cogs' => $cogs,
                'gross_profit' => $grossProfit,
                'operating_expenses' => $operatingExpenses,
                'net_profit' => $netProfit,
            ],
            'expense_breakdown' => $expenseByCategory,
            'rows' => [
                ['line_item' => 'Gross Sales', 'amount' => $grossSales],
                ['line_item' => 'Less: Sales Returns & Refunds', 'amount' => bcmul($salesReturns, '-1', 2)],
                ['line_item' => 'Net Sales', 'amount' => $netSales],
                ['line_item' => 'Less: Cost of Goods Sold (COGS)', 'amount' => bcmul($cogs, '-1', 2)],
                ['line_item' => 'Gross Profit', 'amount' => $grossProfit],
                ['line_item' => 'Less: Operating Expenses', 'amount' => bcmul($operatingExpenses, '-1', 2)],
                ['line_item' => 'Net Profit', 'amount' => $netProfit],
            ],
        ];
    }

    /**
     * @return list<int>
     */
    private function resolveStoreIds(User $user, ?int $requestedStoreId): array
    {
        if ($user->can('stores.access_all')) {
            if ($requestedStoreId !== null) {
                return [$requestedStoreId];
            }

            /** @var list<int> $ids */
            $ids = DB::table('stores')
                ->where('organization_id', $user->organization_id)
                ->pluck('id')
                ->map(static fn ($id): int => is_numeric($id) ? (int) $id : 0)
                ->filter(static fn (int $id): bool => $id > 0)
                ->values()
                ->all();

            return $ids;
        }

        /** @var list<int> $assigned */
        $assigned = $user->stores()
            ->pluck('stores.id')
            ->map(static fn ($id): int => is_numeric($id) ? (int) $id : 0)
            ->filter(static fn (int $id): bool => $id > 0)
            ->values()
            ->all();

        if ($requestedStoreId !== null && in_array($requestedStoreId, $assigned, true)) {
            return [$requestedStoreId];
        }

        return $assigned;
    }
}
