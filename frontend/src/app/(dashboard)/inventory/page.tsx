"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  ExpiredBatchAlert,
  InventoryStockItem,
  StockAdjustmentItem,
  StockMovementItem,
  StockTransferItem,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type InvTab = "overview" | "movements" | "adjustments" | "transfers" | "expired";

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<InvTab>("overview");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const overviewQuery = useQuery({
    queryKey: ["inventory-overview", lowStockOnly],
    queryFn: () =>
      apiFetch<InventoryStockItem[]>(
        `/inventory${lowStockOnly ? "?low_stock_only=1" : ""}`
      ),
    enabled: tab === "overview",
  });

  const movementsQuery = useQuery({
    queryKey: ["inventory-movements"],
    queryFn: () => apiFetch<StockMovementItem[]>("/inventory/movements"),
    enabled: tab === "movements",
  });

  const adjustmentsQuery = useQuery({
    queryKey: ["inventory-adjustments"],
    queryFn: () => apiFetch<StockAdjustmentItem[]>("/inventory/adjustments"),
    enabled: tab === "adjustments",
  });

  const transfersQuery = useQuery({
    queryKey: ["inventory-transfers"],
    queryFn: () => apiFetch<StockTransferItem[]>("/inventory/transfers"),
    enabled: tab === "transfers",
  });

  const expiredQuery = useQuery({
    queryKey: ["inventory-expired"],
    queryFn: () => apiFetch<ExpiredBatchAlert[]>("/inventory/alerts/expired?within_days=30"),
    enabled: tab === "expired",
  });

  const reconcileMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ checked_rows: number; discrepancy_count: number }>("/inventory/reconcile", {
        method: "POST",
      }),
    onSuccess: (res) => {
      if (res.data.discrepancy_count === 0) {
        toast.success(`Reconciled ${res.data.checked_rows} rows — 0 discrepancies.`);
      } else {
        toast.warning(
          `Found ${res.data.discrepancy_count} discrepancies out of ${res.data.checked_rows} rows.`
        );
      }
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Reconciliation failed.");
    },
  });

  const approveAdjustmentMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/inventory/adjustments/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Stock adjustment approved.");
      void queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Approval failed.");
    },
  });

  const transferActionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "ship" | "receive" }) =>
      apiFetch(`/inventory/transfers/${id}/${action}`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Transfer status updated.");
      void queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Transfer action failed.");
    },
  });

  const tabs: Array<{ key: InvTab; label: string }> = [
    { key: "overview", label: "Stock Overview" },
    { key: "movements", label: "Movements Ledger" },
    { key: "adjustments", label: "Adjustments" },
    { key: "transfers", label: "Transfers" },
    { key: "expired", label: "Expired Alerts" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">
            Ledger-backed stock tracking, adjustments, inter-warehouse transfers, and reconciliation.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reconcileMutation.mutate()}
          disabled={reconcileMutation.isPending}
        >
          <RefreshCw className="h-4 w-4" />
          Reconcile Ledger
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "overview" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Current Stock</CardTitle>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
              />
              Low stock only
            </label>
          </CardHeader>
          <CardContent>
            {overviewQuery.isLoading ? (
              <div className="h-24 animate-pulse rounded-md bg-muted" />
            ) : (overviewQuery.data?.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No inventory stock records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Warehouse</th>
                      <th className="py-2 pr-4 font-medium">SKU / Variant</th>
                      <th className="py-2 pr-4 font-medium">On Hand</th>
                      <th className="py-2 pr-4 font-medium">Reserved</th>
                      <th className="py-2 pr-4 font-medium">Available</th>
                      <th className="py-2 font-medium">Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(overviewQuery.data?.data ?? []).map((row) => (
                      <tr key={row.id}>
                        <td className="py-2.5 pr-4">{row.warehouse?.name ?? `#${row.warehouse_id}`}</td>
                        <td className="py-2.5 pr-4">
                          <div className="font-mono text-xs">{row.variant?.sku}</div>
                          <div className="text-xs text-muted-foreground">{row.variant?.name}</div>
                        </td>
                        <td className="py-2.5 pr-4 font-medium">{Number(row.qty_on_hand)}</td>
                        <td className="py-2.5 pr-4">{Number(row.qty_reserved)}</td>
                        <td className="py-2.5 pr-4 font-semibold">{Number(row.qty_available)}</td>
                        <td className="py-2.5">
                          {row.valuation ? formatCurrency(row.valuation) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "movements" && (
        <Card>
          <CardHeader>
            <CardTitle>Stock Movements (Immutable Ledger)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">SKU</th>
                    <th className="py-2 pr-4 font-medium">Before</th>
                    <th className="py-2 pr-4 font-medium">Change</th>
                    <th className="py-2 pr-4 font-medium">After</th>
                    <th className="py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(movementsQuery.data?.data ?? []).map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 pr-4">
                        <Badge>{m.movement_type}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{m.variant?.sku ?? "—"}</td>
                      <td className="py-2.5 pr-4">{Number(m.qty_before)}</td>
                      <td className="py-2.5 pr-4 font-semibold">{Number(m.qty_change)}</td>
                      <td className="py-2.5 pr-4">{Number(m.qty_after)}</td>
                      <td className="py-2.5 text-xs text-muted-foreground">{m.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "adjustments" && (
        <Card>
          <CardHeader>
            <CardTitle>Stock Adjustments</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {(adjustmentsQuery.data?.data ?? []).map((adj) => (
              <div key={adj.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-mono text-xs font-semibold">{adj.adjustment_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {adj.warehouse?.name} • {adj.reason}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={adj.status === "approved" ? "success" : "warning"}>
                    {adj.status}
                  </Badge>
                  {adj.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => approveAdjustmentMutation.mutate(adj.id)}
                      disabled={approveAdjustmentMutation.isPending}
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!adjustmentsQuery.isLoading && (adjustmentsQuery.data?.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No stock adjustments yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "transfers" && (
        <Card>
          <CardHeader>
            <CardTitle>Stock Transfers</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {(transfersQuery.data?.data ?? []).map((trf) => (
              <div key={trf.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-mono text-xs font-semibold">{trf.transfer_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {trf.from_warehouse?.name} → {trf.to_warehouse?.name}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={trf.status === "received" ? "success" : "warning"}>
                    {trf.status}
                  </Badge>
                  {trf.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => transferActionMutation.mutate({ id: trf.id, action: "ship" })}
                    >
                      Ship
                    </Button>
                  )}
                  {trf.status === "in_transit" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        transferActionMutation.mutate({ id: trf.id, action: "receive" })
                      }
                    >
                      Receive
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!transfersQuery.isLoading && (transfersQuery.data?.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No stock transfers yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "expired" && (
        <Card>
          <CardHeader>
            <CardTitle>Expiring & Expired Batches (Next 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {(expiredQuery.data?.data ?? []).map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-mono text-xs mr-2">{b.batch_number}</span>
                  <span className="font-medium">{b.variant_name ?? b.sku}</span>
                </div>
                <Badge variant={b.is_expired ? "warning" : "muted"}>
                  Exp: {b.expired_at ?? "—"}
                </Badge>
              </div>
            ))}
            {!expiredQuery.isLoading && (expiredQuery.data?.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No expiring batches within 30 days.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
