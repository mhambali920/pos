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
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch } from "@/lib/api";
import type { DashboardPayload } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    revenue: Number.parseFloat(pt.revenue),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {activeStore
              ? `Active Outlet: ${activeStore.code} — ${activeStore.name} (${activeStore.timezone})`
              : "Role-based operational & financial overview"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["owner", "manager", "cashier"] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={roleView === r ? "default" : "outline"}
              onClick={() => setRoleView(r)}
            >
              {r === "owner" ? "Owner" : r === "manager" ? "Store Manager" : "Cashier"}
            </Button>
          ))}
          <Input
            type="date"
            aria-label="Date from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-36 text-xs"
          />
          <Input
            type="date"
            aria-label="Date to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-36 text-xs"
          />
          {!user && (
            <Link href="/login">
              <Button size="sm">
                Sign In <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {dashboardQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : roleView === "cashier" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                My Sales Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {formatCurrency(String(data?.kpis.my_sales_total ?? "0"))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                My Transactions
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {String(data?.kpis.my_transaction_count ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Held Carts
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {String(data?.kpis.held_transactions ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cash Register
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={data?.kpis.has_open_register ? "success" : "warning"}>
                {data?.kpis.has_open_register ? "Session Open" : "Closed"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {formatCurrency(String(data?.kpis.net_sales ?? "0"))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {String(data?.kpis.transaction_count ?? 0)} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {roleView === "owner" ? "Net Profit" : "Avg Basket"}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {formatCurrency(
                  String(
                    roleView === "owner"
                      ? (data?.kpis.net_profit ?? "0")
                      : (data?.kpis.average_basket ?? "0")
                  )
                )}
              </div>
              {roleView === "owner" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Gross Profit: {formatCurrency(String(data?.kpis.gross_profit ?? "0"))}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {roleView === "owner" ? "Operating Expenses" : "Pending Expenses"}
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {roleView === "owner"
                  ? formatCurrency(String(data?.kpis.total_expenses ?? "0"))
                  : String(data?.kpis.pending_expenses ?? 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Low Stock Alerts
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {String(data?.kpis.low_stock_count ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">SKUs at or below reorder point</p>
            </CardContent>
          </Card>
        </div>
      )}

      {roleView !== "cashier" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Daily Revenue Trend</CardTitle>
              <CardDescription>
                {data?.period ? `${data.period.from} to ${data.period.to}` : "Last 30 days"}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No sales data for the selected period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#0F766E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.top_products ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No product sales yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {(data?.top_products ?? []).map((item) => (
                    <div key={item.sku} className="flex items-center justify-between py-2.5 text-xs">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="font-mono text-muted-foreground">
                          {item.sku} • Qty {Number.parseFloat(item.total_qty)}
                        </div>
                      </div>
                      <div className="font-mono font-semibold">
                        {formatCurrency(item.total_revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
