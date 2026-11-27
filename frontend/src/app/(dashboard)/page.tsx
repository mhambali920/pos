"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  DollarSign,
  Receipt,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChartContainer,
  EmptyState,
  Heading,
  SegmentedControl,
  SegmentedControlItem,
  Skeleton,
  Stat,
  StatGroup,
  Text,
} from "@eta-ui/react";
import { IsoDatePicker } from "@/components/shared/iso-date-picker";
import { apiFetch } from "@/lib/api";
import type { DashboardPayload } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function parseLocalIso(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function diffDays(start: Date, end: Date): number {
  const msPerDay = 86_400_000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

function formatAxisCompactIdr(value: number): string {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(abs % 1_000_000_000 === 0 ? 0 : 1)}M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}jt`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}rb`;
  }
  return `${sign}${abs}`;
}

function buildDailyChartSeries(
  rawTrend: Array<{ date: string; revenue: string }>,
  period?: { from: string; to: string },
  hasCustomFilter = false
): { points: Array<{ date: string; revenue: number }>; from: string; to: string } {
  if (rawTrend.length === 0) {
    return {
      points: [],
      from: period?.from ?? "",
      to: period?.to ?? "",
    };
  }

  const revenueByIso = new Map<string, number>();
  let earliestSale: Date | null = null;
  let latestSale: Date | null = null;

  for (const pt of rawTrend) {
    const val = Number.parseFloat(pt.revenue) || 0;
    revenueByIso.set(pt.date, val);
    const parsed = parseLocalIso(pt.date);
    if (parsed) {
      if (!earliestSale || parsed < earliestSale) earliestSale = parsed;
      if (!latestSale || parsed > latestSale) latestSale = parsed;
    }
  }

  const endDate = (period?.to ? parseLocalIso(period.to) : null) ?? latestSale ?? new Date();
  const minWindowStart = addDays(endDate, -17); // Minimum 18 slots for balanced bar width across desktop & laptop

  let startDate: Date;
  if (hasCustomFilter && period?.from) {
    const customStart = parseLocalIso(period.from) ?? minWindowStart;
    startDate = customStart < minWindowStart ? customStart : minWindowStart;
  } else if (earliestSale && earliestSale < minWindowStart) {
    startDate = earliestSale;
  } else {
    startDate = minWindowStart;
  }

  const totalDays = Math.min(60, Math.max(1, diffDays(startDate, endDate) + 1));
  const useNumericDate = totalDays > 12;
  const points: Array<{ date: string; revenue: number }> = [];

  for (let i = 0; i < totalDays; i++) {
    const cur = addDays(startDate, i);
    const iso = toIsoDate(cur);
    const dayNum = String(cur.getDate()).padStart(2, "0");
    const label = useNumericDate
      ? `${dayNum}/${String(cur.getMonth() + 1).padStart(2, "0")}`
      : `${cur.getDate()} ${SHORT_MONTHS[cur.getMonth()]}`;

    points.push({
      date: label,
      revenue: revenueByIso.get(iso) ?? 0,
    });
  }

  return {
    points,
    from: toIsoDate(startDate),
    to: toIsoDate(endDate),
  };
}

export default function DashboardHomePage() {
  const { user, activeStoreId } = useAuthStore();
  const activeStore = user?.stores?.find((s) => s.id === activeStoreId);

  const [roleView, setRoleView] = useState<"owner" | "manager" | "cashier">("owner");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.set("date_from", dateFrom);
  if (dateTo) queryParams.set("date_to", dateTo);
  const qs = queryParams.toString();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", roleView, activeStoreId, dateFrom, dateTo],
    queryFn: () =>
      apiFetch<DashboardPayload>(`/dashboard/${roleView}${qs ? `?${qs}` : ""}`),
    enabled: Boolean(user),
  });

  const data = dashboardQuery.data?.data;
  const chartSeries = buildDailyChartSeries(
    data?.daily_trend ?? [],
    data?.period,
    Boolean(dateFrom || dateTo)
  );
  const chartData = chartSeries.points;
  const chartSubtitle =
    chartSeries.from && chartSeries.to
      ? `${chartSeries.from} to ${chartSeries.to}`
      : data?.period
        ? `${data.period.from} to ${data.period.to}`
        : "Last 30 days";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading as="h1" size="xl" weight="semibold">
            Analytics Dashboard
          </Heading>
          <Text size="sm" variant="muted" className="mt-0.5">
            {activeStore
              ? `Active Outlet: ${activeStore.code} — ${activeStore.name} (${activeStore.timezone})`
              : "Role-based operational & financial overview"}
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            type="single"
            variant="segmented"
            size="sm"
            value={roleView}
            onValueChange={(val) => {
              if (val === "owner" || val === "manager" || val === "cashier") {
                setRoleView(val);
              }
            }}
          >
            <SegmentedControlItem value="owner">Owner</SegmentedControlItem>
            <SegmentedControlItem value="manager">Store Manager</SegmentedControlItem>
            <SegmentedControlItem value="cashier">Cashier</SegmentedControlItem>
          </SegmentedControl>

          <IsoDatePicker
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="From date"
            allowClear
            size="sm"
            className="w-40"
          />
          <IsoDatePicker
            value={dateTo}
            onChange={setDateTo}
            placeholder="To date"
            allowClear
            size="sm"
            className="w-40"
          />

          {!user && (
            <Button asChild size="sm" variant="solid" color="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>

      {dashboardQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} variant="rounded" height={112} />
          ))}
        </div>
      ) : roleView === "cashier" ? (
        <StatGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            variant="surface"
            label="My Sales Total"
            value={
              <span className="font-mono">
                {formatCurrency(String(data?.kpis.my_sales_total ?? "0"))}
              </span>
            }
            icon={<DollarSign className="h-4 w-4" />}
          />
          <Stat
            variant="surface"
            label="My Transactions"
            value={<span className="font-mono">{String(data?.kpis.my_transaction_count ?? 0)}</span>}
            icon={<Receipt className="h-4 w-4" />}
          />
          <Stat
            variant="surface"
            label="Held Carts"
            value={<span className="font-mono">{String(data?.kpis.held_transactions ?? 0)}</span>}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <Stat
            variant="surface"
            label="Cash Register"
            value={
              <Badge
                variant="soft"
                color={data?.kpis.has_open_register ? "success" : "warning"}
                size="md"
              >
                {data?.kpis.has_open_register ? "Session Open" : "Closed"}
              </Badge>
            }
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </StatGroup>
      ) : (
        <StatGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            variant="surface"
            label="Net Sales"
            value={
              <span className="font-mono">
                {formatCurrency(String(data?.kpis.net_sales ?? "0"))}
              </span>
            }
            helpText={`${String(data?.kpis.transaction_count ?? 0)} transactions`}
            icon={<DollarSign className="h-4 w-4" />}
          />

          <Stat
            variant="surface"
            label={roleView === "owner" ? "Net Profit" : "Avg Basket"}
            value={
              <span className="font-mono">
                {formatCurrency(
                  String(
                    roleView === "owner"
                      ? (data?.kpis.net_profit ?? "0")
                      : (data?.kpis.average_basket ?? "0")
                  )
                )}
              </span>
            }
            helpText={
              roleView === "owner"
                ? `Gross Profit: ${formatCurrency(String(data?.kpis.gross_profit ?? "0"))}`
                : undefined
            }
            icon={<TrendingUp className="h-4 w-4" />}
          />

          <Stat
            variant="surface"
            label={roleView === "owner" ? "Operating Expenses" : "Pending Expenses"}
            value={
              <span className="font-mono">
                {roleView === "owner"
                  ? formatCurrency(String(data?.kpis.total_expenses ?? "0"))
                  : String(data?.kpis.pending_expenses ?? 0)}
              </span>
            }
            icon={<Receipt className="h-4 w-4" />}
          />

          <Stat
            variant="surface"
            label="Low Stock Alerts"
            value={<span className="font-mono">{String(data?.kpis.low_stock_count ?? 0)}</span>}
            helpText="SKUs at or below reorder point"
            icon={<AlertTriangle className="h-4 w-4 text-eta-warning" />}
          />
        </StatGroup>
      )}

      {roleView !== "cashier" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {dashboardQuery.isLoading ? (
              <ChartContainer
                variant="surface"
                title="Daily Revenue Trend"
                description={chartSubtitle}
                height={260}
                isLoading
              />
            ) : chartData.length === 0 ? (
              <ChartContainer
                variant="surface"
                title="Daily Revenue Trend"
                description={chartSubtitle}
                height={260}
                isEmpty
                emptyState={
                  <EmptyState
                    size="sm"
                    title="No sales data"
                    description="No sales data for the selected period."
                  />
                }
              />
            ) : (
              <BarChart
                title="Daily Revenue Trend"
                description={chartSubtitle}
                data={chartData}
                indexKey="date"
                series={[{ key: "revenue", label: "Revenue", color: "primary" }]}
                height={260}
                variant="surface"
                valueFormatter={(value, seriesKey) =>
                  seriesKey ? formatCurrency(value) : formatAxisCompactIdr(value)
                }
              />
            )}
          </div>

          <Card variant="elevated" padding="md">
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardBody>
              {(data?.top_products ?? []).length === 0 ? (
                <EmptyState
                  size="sm"
                  title="No product sales yet"
                  description="Completed transactions will appear here."
                />
              ) : (
                <div className="divide-y divide-eta-border">
                  {(data?.top_products ?? []).map((item) => (
                    <div key={item.sku} className="flex items-center justify-between py-2.5 text-xs">
                      <div>
                        <div className="font-medium text-eta-heading">{item.name}</div>
                        <div className="font-mono text-eta-muted">
                          {item.sku} • Qty {Number.parseFloat(item.total_qty)}
                        </div>
                      </div>
                      <div className="font-mono font-semibold text-eta-heading">
                        {formatCurrency(item.total_revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
