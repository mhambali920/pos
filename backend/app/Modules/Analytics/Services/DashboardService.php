<?php

declare(strict_types=1);

namespace App\Modules\Analytics\Services;

use App\Models\User;
use App\Modules\CashManagement\Models\CashRegisterSession;
use App\Modules\Expense\Models\Expense;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Sales\Models\Sale;
use App\Modules\Sales\Models\SaleItem;
use App\Modules\Sales\Models\SaleReturn;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class DashboardService
{
    /**
     * @param  array{date_from?: string|null, date_to?: string|null, store_id?: int|null, cashier_id?: int|null, category_id?: int|null}  $filters
     * @return array<string, mixed>
     */
    public function build(User $user, string $role, array $filters): array
    {
        $from = isset($filters['date_from']) && $filters['date_from'] !== ''
            ? Carbon::parse($filters['date_from'])->startOfDay()
            : now()->subDays(29)->startOfDay();
        $to = isset($filters['date_to']) && $filters['date_to'] !== ''
            ? Carbon::parse($filters['date_to'])->endOfDay()
            : now()->endOfDay();

        $allowedStoreIds = $this->resolveAllowedStoreIds($user, $filters['store_id'] ?? null);

        return match ($role) {
            'owner' => $this->buildOwnerDashboard($user->organization_id, $allowedStoreIds, $from, $to, $filters),
            'manager' => $this->buildManagerDashboard($user->organization_id, $allowedStoreIds, $from, $to, $filters),
            default => $this->buildCashierDashboard($user, $allowedStoreIds, $from, $to),
        };
    }

    /**
     * @return list<int>
     */
    private function resolveAllowedStoreIds(User $user, ?int $requestedStoreId): array
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

    /**
     * @param  list<int>  $storeIds
     * @param  array{cashier_id?: int|null, category_id?: int|null}  $filters
     * @return array<string, mixed>
     */
    private function buildOwnerDashboard(
        int $orgId,
        array $storeIds,
        Carbon $from,
        Carbon $to,
        array $filters,
    ): array {
        $salesQuery = Sale::query()
            ->where('organization_id', $orgId)
            ->whereIn('store_id', $storeIds)
            ->whereIn('status', ['paid', 'partially_refunded', 'refunded'])
            ->whereBetween('completed_at', [$from, $to]);

        if (isset($filters['cashier_id'])) {
            $salesQuery->where('cashier_id', $filters['cashier_id']);
        }

        $sales = $salesQuery->get(['id', 'store_id', 'grand_total', 'discount_total', 'tax_total', 'completed_at']);

        $grossSales = '0.00';
        $dailyMap = [];

        foreach ($sales as $sale) {
            $grossSales = bcadd($grossSales, $sale->grand_total, 2);
            $day = $sale->completed_at?->toDateString() ?? now()->toDateString();
            $dailyMap[$day] = bcadd($dailyMap[$day] ?? '0.00', $sale->grand_total, 2);
        }

        $refunds = SaleReturn::query()
            ->where('organization_id', $orgId)
            ->whereIn('store_id', $storeIds)
            ->where('status', 'completed')
            ->whereBetween('created_at', [$from, $to])
            ->pluck('refund_amount');

        $totalRefunds = '0.00';
        foreach ($refunds as $amt) {
            $totalRefunds = bcadd($totalRefunds, $this->toDecimal($amt), 2);
        }

        $netSales = bcsub($grossSales, $totalRefunds, 2);
        $saleIds = array_values($sales->map(static fn (Sale $sale): int => $sale->id)->all());

        $cogs = $this->calculateCogs($saleIds, $filters['category_id'] ?? null);
        $grossProfit = bcsub($netSales, $cogs, 2);

        $expenses = Expense::query()
            ->where('organization_id', $orgId)
            ->whereIn('store_id', $storeIds)
            ->where('status', 'approved')
            ->whereDate('expense_date', '>=', $from->toDateString())
            ->whereDate('expense_date', '<=', $to->toDateString())
            ->pluck('amount');

        $totalExpenses = '0.00';
        foreach ($expenses as $amt) {
            $totalExpenses = bcadd($totalExpenses, $this->toDecimal($amt), 2);
        }

        $netProfit = bcsub($grossProfit, $totalExpenses, 2);
        $txCount = $sales->count();
        $avgBasket = $txCount > 0 ? bcdiv($grossSales, (string) $txCount, 2) : '0.00';

        ksort($dailyMap);
        $dailyTrend = [];
        foreach ($dailyMap as $date => $revenue) {
            $dailyTrend[] = ['date' => $date, 'revenue' => $revenue];
        }

        return [
            'role' => 'owner',
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'kpis' => [
                'gross_sales' => $grossSales,
                'total_refunds' => $totalRefunds,
                'net_sales' => $netSales,
                'cogs' => $cogs,
                'gross_profit' => $grossProfit,
                'total_expenses' => $totalExpenses,
                'net_profit' => $netProfit,
                'transaction_count' => $txCount,
                'average_basket' => $avgBasket,
                'low_stock_count' => $this->countLowStock($orgId, $storeIds),
            ],
            'daily_trend' => $dailyTrend,
            'top_products' => $this->topProducts($saleIds, $filters['category_id'] ?? null),
        ];
    }

    /**
     * @param  list<int>  $storeIds
     * @param  array{cashier_id?: int|null, category_id?: int|null}  $filters
     * @return array<string, mixed>
     */
    private function buildManagerDashboard(
        int $orgId,
        array $storeIds,
        Carbon $from,
        Carbon $to,
        array $filters,
    ): array {
        $ownerData = $this->buildOwnerDashboard($orgId, $storeIds, $from, $to, $filters);

        $openSessions = CashRegisterSession::query()
            ->where('organization_id', $orgId)
            ->whereIn('store_id', $storeIds)
            ->where('status', 'open')
            ->count();

        $pendingExpenses = Expense::query()
            ->where('organization_id', $orgId)
            ->whereIn('store_id', $storeIds)
            ->where('status', 'pending_approval')
            ->count();

        return [
            'role' => 'manager',
            'period' => $ownerData['period'],
            'kpis' => [
                'gross_sales' => $ownerData['kpis']['gross_sales'],
                'net_sales' => $ownerData['kpis']['net_sales'],
                'transaction_count' => $ownerData['kpis']['transaction_count'],
                'average_basket' => $ownerData['kpis']['average_basket'],
                'open_register_sessions' => $openSessions,
                'pending_expenses' => $pendingExpenses,
                'low_stock_count' => $ownerData['kpis']['low_stock_count'],
            ],
            'daily_trend' => $ownerData['daily_trend'],
            'top_products' => $ownerData['top_products'],
        ];
    }

    /**
     * @param  list<int>  $storeIds
     * @return array<string, mixed>
     */
    private function buildCashierDashboard(User $user, array $storeIds, Carbon $from, Carbon $to): array
    {
        $sales = Sale::query()
            ->where('organization_id', $user->organization_id)
            ->whereIn('store_id', $storeIds)
            ->where('cashier_id', $user->id)
            ->whereIn('status', ['paid', 'partially_refunded', 'refunded'])
            ->whereBetween('completed_at', [$from, $to])
            ->orderByDesc('completed_at')
            ->orderByDesc('id')
            ->get(['id', 'transaction_number', 'grand_total', 'status', 'completed_at']);

        $totalSales = '0.00';
        foreach ($sales as $sale) {
            $totalSales = bcadd($totalSales, $sale->grand_total, 2);
        }

        $heldCount = Sale::query()
            ->where('organization_id', $user->organization_id)
            ->whereIn('store_id', $storeIds)
            ->where('cashier_id', $user->id)
            ->where('status', 'held')
            ->count();

        $activeSession = CashRegisterSession::query()
            ->whereIn('store_id', $storeIds)
            ->where('user_id', $user->id)
            ->where('status', 'open')
            ->orderByDesc('opened_at')
            ->orderByDesc('id')
            ->first();

        return [
            'role' => 'cashier',
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'kpis' => [
                'my_sales_total' => $totalSales,
                'my_transaction_count' => $sales->count(),
                'held_transactions' => $heldCount,
                'has_open_register' => $activeSession instanceof CashRegisterSession,
            ],
            'recent_sales' => $sales->take(10)->values()->all(),
        ];
    }

    /**
     * @param  list<int>  $saleIds
     * @return numeric-string
     */
    private function calculateCogs(array $saleIds, ?int $categoryId): string
    {
        if ($saleIds === []) {
            return '0.00';
        }

        $query = SaleItem::query()->whereIn('sale_id', $saleIds);
        if ($categoryId !== null) {
            $query->whereHas('variant.product', static fn ($q) => $q->where('category_id', $categoryId));
        }

        $items = $query->get(['quantity', 'cost_price_snapshot']);
        $cogs = '0.00';

        foreach ($items as $item) {
            $cogs = bcadd($cogs, bcmul($item->cost_price_snapshot, $item->quantity, 2), 2);
        }

        return $cogs;
    }

    /**
     * @param  list<int>  $saleIds
     * @return list<array{sku: string, name: string, total_qty: numeric-string, total_revenue: numeric-string}>
     */
    private function topProducts(array $saleIds, ?int $categoryId): array
    {
        if ($saleIds === []) {
            return [];
        }

        $query = SaleItem::query()->whereIn('sale_id', $saleIds);
        if ($categoryId !== null) {
            $query->whereHas('variant.product', static fn ($q) => $q->where('category_id', $categoryId));
        }

        $items = $query->get(['sku_snapshot', 'product_name_snapshot', 'quantity', 'line_total']);

        $grouped = [];
        foreach ($items as $item) {
            $key = $item->sku_snapshot;
            if (! isset($grouped[$key])) {
                $grouped[$key] = [
                    'sku' => $item->sku_snapshot,
                    'name' => $item->product_name_snapshot,
                    'total_qty' => '0.0000',
                    'total_revenue' => '0.00',
                ];
            }
            $grouped[$key]['total_qty'] = bcadd($grouped[$key]['total_qty'], $item->quantity, 4);
            $grouped[$key]['total_revenue'] = bcadd($grouped[$key]['total_revenue'], $item->line_total, 2);
        }

        usort($grouped, static fn (array $a, array $b): int => bccomp($b['total_revenue'], $a['total_revenue'], 2));

        return array_slice($grouped, 0, 5);
    }

    /**
     * @param  list<int>  $storeIds
     */
    private function countLowStock(int $orgId, array $storeIds): int
    {
        return InventoryStock::query()
            ->join('warehouses', 'warehouses.id', '=', 'inventory_stocks.warehouse_id')
            ->join('product_variants', 'product_variants.id', '=', 'inventory_stocks.product_variant_id')
            ->where('inventory_stocks.organization_id', $orgId)
            ->where(function ($q) use ($storeIds): void {
                $q->whereIn('warehouses.store_id', $storeIds)->orWhereNull('warehouses.store_id');
            })
            ->whereColumn('inventory_stocks.qty_on_hand', '<=', 'product_variants.reorder_point')
            ->count();
    }

    /**
     * @return numeric-string
     */
    private function toDecimal(mixed $value): string
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
