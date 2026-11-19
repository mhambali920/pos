"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  GoodsReceiptSummary,
  PurchaseInvoiceSummary,
  PurchaseOrderSummary,
  PurchaseReturnSummary,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PurchasingTab = "orders" | "receipts" | "invoices" | "returns";

export default function PurchasingPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PurchasingTab>("orders");

  const ordersQuery = useQuery({
    queryKey: ["purchasing-orders"],
    queryFn: () => apiFetch<PurchaseOrderSummary[]>("/purchasing/orders"),
    enabled: tab === "orders",
  });

  const receiptsQuery = useQuery({
    queryKey: ["purchasing-receipts"],
    queryFn: () => apiFetch<GoodsReceiptSummary[]>("/purchasing/goods-receipts"),
    enabled: tab === "receipts",
  });

  const invoicesQuery = useQuery({
    queryKey: ["purchasing-invoices"],
    queryFn: () => apiFetch<PurchaseInvoiceSummary[]>("/purchasing/invoices"),
    enabled: tab === "invoices",
  });

  const returnsQuery = useQuery({
    queryKey: ["purchasing-returns"],
    queryFn: () => apiFetch<PurchaseReturnSummary[]>("/purchasing/returns"),
    enabled: tab === "returns",
  });

  const poActionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "submit" | "approve" | "cancel" }) =>
      apiFetch(`/purchasing/orders/${id}/${action}`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Purchase order updated.");
      void queryClient.invalidateQueries({ queryKey: ["purchasing-orders"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Action failed."),
  });

  const confirmGrnMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/purchasing/goods-receipts/${id}/confirm`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Goods receipt confirmed and inventory updated.");
      void queryClient.invalidateQueries({ queryKey: ["purchasing-receipts"] });
      void queryClient.invalidateQueries({ queryKey: ["purchasing-orders"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Confirmation failed."),
  });

  const confirmReturnMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/purchasing/returns/${id}/confirm`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Purchase return confirmed and credit note issued.");
      void queryClient.invalidateQueries({ queryKey: ["purchasing-returns"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Confirmation failed."),
  });

  const tabs: Array<{ key: PurchasingTab; label: string }> = [
    { key: "orders", label: "Purchase Orders" },
    { key: "receipts", label: "Goods Receipts" },
    { key: "invoices", label: "Invoices" },
    { key: "returns", label: "Returns" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Purchasing Management</h1>
        <p className="text-sm text-muted-foreground">
          End-to-end procurement: Purchase Orders, Goods Receipts, Supplier Invoices, and Returns.
        </p>
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

      {tab === "orders" && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {(ordersQuery.data?.data ?? []).map((po) => (
              <div
                key={po.id}
                className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-mono text-xs font-semibold">{po.po_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {po.supplier?.company_name ?? "—"} • {po.warehouse?.name ?? "—"} •{" "}
                    {formatCurrency(po.grand_total)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={po.status === "received" ? "success" : "warning"}>
                    {po.status}
                  </Badge>
                  {po.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => poActionMutation.mutate({ id: po.id, action: "submit" })}
                    >
                      Submit
                    </Button>
                  )}
                  {(po.status === "draft" || po.status === "submitted") && (
                    <Button
                      size="sm"
                      onClick={() => poActionMutation.mutate({ id: po.id, action: "approve" })}
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!ordersQuery.isLoading && (ordersQuery.data?.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "receipts" && (
        <Card>
          <CardHeader>
            <CardTitle>Goods Receipts (GRN)</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {(receiptsQuery.data?.data ?? []).map((grn) => (
              <div key={grn.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-mono text-xs font-semibold">{grn.grn_number}</div>
                  <div className="text-xs text-muted-foreground">
                    PO: {grn.purchase_order?.po_number ?? "—"} • {grn.warehouse?.name ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={grn.status === "confirmed" ? "success" : "warning"}>
                    {grn.status}
                  </Badge>
                  {grn.status === "draft" && (
                    <Button size="sm" onClick={() => confirmGrnMutation.mutate(grn.id)}>
                      Confirm
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!receiptsQuery.isLoading && (receiptsQuery.data?.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No goods receipts yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "invoices" && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase Invoices</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {(invoicesQuery.data?.data ?? []).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-mono text-xs font-semibold">{inv.invoice_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.supplier?.company_name ?? "—"} • Paid {formatCurrency(inv.paid_amount)} /{" "}
                    {formatCurrency(inv.grand_total)}
                  </div>
                </div>
                <Badge variant={inv.payment_status === "paid" ? "success" : "warning"}>
                  {inv.payment_status}
                </Badge>
              </div>
            ))}
            {!invoicesQuery.isLoading && (invoicesQuery.data?.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No purchase invoices yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "returns" && (
        <Card>
          <CardHeader>
            <CardTitle>Purchase Returns</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {(returnsQuery.data?.data ?? []).map((ret) => (
              <div key={ret.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-mono text-xs font-semibold">
                    {ret.return_number} {ret.credit_note_no ? `(${ret.credit_note_no})` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ret.supplier?.company_name ?? "—"} • {ret.reason} •{" "}
                    {formatCurrency(ret.total_amount)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ret.status === "confirmed" ? "success" : "warning"}>
                    {ret.status}
                  </Badge>
                  {ret.status === "draft" && (
                    <Button size="sm" onClick={() => confirmReturnMutation.mutate(ret.id)}>
                      Confirm
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!returnsQuery.isLoading && (returnsQuery.data?.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No purchase returns yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
