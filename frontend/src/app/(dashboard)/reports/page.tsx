"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { PromotionItem, ReportExportItem, ReportPayload } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TabType = "sales" | "inventory" | "purchasing" | "financial" | "promotions" | "exports";

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("financial");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [promoCode, setPromoCode] = useState("");
  const [promoName, setPromoName] = useState("");
  const [promoType, setPromoType] = useState("percentage");
  const [promoValue, setPromoValue] = useState("10");
  const [promoStackable, setPromoStackable] = useState(true);

  const isReportTab =
    activeTab === "sales" ||
    activeTab === "inventory" ||
    activeTab === "purchasing" ||
    activeTab === "financial";

  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const qs = params.toString();

  const reportQuery = useQuery({
    queryKey: ["report", activeTab, dateFrom, dateTo],
    queryFn: () => apiFetch<ReportPayload>(`/reports/${activeTab}${qs ? `?${qs}` : ""}`),
    enabled: isReportTab,
  });

  const promotionsQuery = useQuery({
    queryKey: ["promotions"],
    queryFn: () => apiFetch<PromotionItem[]>("/promotions"),
    enabled: activeTab === "promotions",
  });

  const exportsQuery = useQuery({
    queryKey: ["report-exports"],
    queryFn: () => apiFetch<ReportExportItem[]>("/reports/exports"),
    enabled: activeTab === "exports",
  });

  const exportMutation = useMutation({
    mutationFn: (format: "csv" | "excel" | "pdf") =>
      apiFetch<ReportExportItem>(`/reports/${activeTab}/export`, {
        method: "POST",
        body: {
          format,
          date_from: dateFrom || null,
          date_to: dateTo || null,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Export (${res.data.format.toUpperCase()}) ${res.data.status}.`);
      void queryClient.invalidateQueries({ queryKey: ["report-exports"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Export failed."),
  });

  const createPromoMutation = useMutation({
    mutationFn: () =>
      apiFetch("/promotions", {
        method: "POST",
        body: {
          code: promoCode,
          name: promoName,
          type: promoType,
          is_stackable: promoStackable,
          rules:
            promoType === "percentage" || promoType === "time_based"
              ? { percentage: Number(promoValue) }
              : { amount: promoValue },
        },
      }),
    onSuccess: () => {
      toast.success("Promotion created.");
      setPromoCode("");
      setPromoName("");
      void queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to create promotion."),
  });

  const report = reportQuery.data?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports, Promotions & Exports</h1>
          <p className="text-sm text-muted-foreground">
            Sales, inventory valuation, purchasing, P&amp;L financial statements, promotions, and async exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="Start date"
            allowClear
            className="h-9 w-40 text-xs"
          />
          <DatePicker
            value={dateTo}
            onChange={setDateTo}
            placeholder="End date"
            allowClear
            className="h-9 w-40 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["financial", "Financial (P&L)"],
              ["sales", "Sales"],
              ["inventory", "Inventory"],
              ["purchasing", "Purchasing"],
              ["promotions", "Promotions"],
              ["exports", "Async Exports"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={activeTab === key ? "default" : "outline"}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {isReportTab && (
          <div className="flex items-center gap-1.5">
            {(["csv", "excel", "pdf"] as const).map((fmt) => (
              <Button
                key={fmt}
                size="sm"
                variant="outline"
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate(fmt)}
              >
                <Download className="h-3.5 w-3.5" /> {fmt.toUpperCase()}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isReportTab && (
        <div className="space-y-4">
          {report && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(report.summary).map(([key, val]) => (
                <Card key={key}>
                  <CardContent className="pt-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {key.replaceAll("_", " ")}
                    </div>
                    <div className="mt-1 text-xl font-bold font-mono">
                      {typeof val === "string" && val.includes(".")
                        ? formatCurrency(val)
                        : String(val)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{activeTab} Report Details</CardTitle>
            </CardHeader>
            <CardContent>
              {reportQuery.isLoading ? (
                <div className="h-28 animate-pulse rounded-md bg-muted" />
              ) : !report || report.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No records for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border text-muted-foreground">
                      <tr>
                        {Object.keys(report.rows[0]).map((col) => (
                          <th key={col} className="py-2 pr-4 font-medium capitalize">
                            {col.replaceAll("_", " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.rows.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((cell, cIdx) => (
                            <td key={cIdx} className="py-2 pr-4 font-mono">
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "promotions" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4" /> Create Promotion
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-5">
              <Input
                placeholder="Code (e.g. WEEKEND10)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <Input
                placeholder="Promotion Name"
                value={promoName}
                onChange={(e) => setPromoName(e.target.value)}
              />
              <Select value={promoType} onValueChange={(v) => setPromoType(v ?? "percentage")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                  <SelectItem value="coupon">Coupon</SelectItem>
                  <SelectItem value="bogo">BOGO</SelectItem>
                  <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Value"
                value={promoValue}
                onChange={(e) => setPromoValue(e.target.value)}
              />
              <Button
                disabled={createPromoMutation.isPending || !promoCode || !promoName}
                onClick={() => createPromoMutation.mutate()}
              >
                <Plus className="h-4 w-4" /> Create
              </Button>
              <label className="sm:col-span-5 flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={promoStackable}
                  onCheckedChange={(v) => setPromoStackable(Boolean(v))}
                />
                Allow stacking with lower-priority promotions
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Promotions</CardTitle>
            </CardHeader>
            <CardContent>
              {(promotionsQuery.data?.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No promotions configured yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {(promotionsQuery.data?.data ?? []).map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <span className="font-mono text-xs font-semibold">{p.code}</span> —{" "}
                        {p.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="muted">{p.type}</Badge>
                        <Badge variant={p.is_stackable ? "success" : "warning"}>
                          {p.is_stackable ? "Stackable" : "Exclusive"}
                        </Badge>
                        <span className="font-mono text-muted-foreground">
                          Priority {p.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "exports" && (
        <Card>
          <CardHeader>
            <CardTitle>Async Export History</CardTitle>
          </CardHeader>
          <CardContent>
            {(exportsQuery.data?.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No exports queued yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {(exportsQuery.data?.data ?? []).map((exp) => (
                  <div
                    key={exp.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium capitalize">
                        {exp.report_type} Report ({exp.format.toUpperCase()})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Requested {new Date(exp.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant={exp.status === "completed" ? "success" : "warning"}>
                      {exp.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
