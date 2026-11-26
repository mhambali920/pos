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
  const chartData = (data?.daily_trend ?? []).map((pt) => ({
    date: pt.date,
    revenue: Number.parseFloat(pt.revenue) || 0,
  }));

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
            <BarChart
              title="Daily Revenue Trend"
              description={data?.period ? `${data.period.from} to ${data.period.to}` : "Last 30 days"}
              data={chartData}
              indexKey="date"
              series={[{ key: "revenue", label: "Revenue", color: "primary" }]}
              height={260}
              variant="surface"
              valueFormatter={(value) => formatCurrency(value)}
              isLoading={dashboardQuery.isLoading}
              emptyState={
                <EmptyState
                  size="sm"
                  title="No sales data"
                  description="No sales data for the selected period."
                />
              }
            />
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
