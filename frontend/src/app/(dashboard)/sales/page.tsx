"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  PaymentMethodItem,
  ReceiptPayload,
  SaleReturnSummary,
  SaleSummary,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface RefundDraftLine {
  sale_item_id: number;
  name: string;
  sku: string;
  remaining: number;
  quantity: string;
  condition: "resellable" | "damaged";
}

export default function SalesHistoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"sales" | "returns">("sales");
  const [statusFilter, setStatusFilter] = useState("");
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);

  const [refundSale, setRefundSale] = useState<SaleSummary | null>(null);
  const [refundLines, setRefundLines] = useState<RefundDraftLine[]>([]);
  const [refundReason, setRefundReason] = useState("");
  const [refundMethodId, setRefundMethodId] = useState("");

  const salesQuery = useQuery({
    queryKey: ["sales", statusFilter],
    queryFn: () =>
      apiFetch<SaleSummary[]>(
        `/sales${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""}`
      ),
  });

  const returnsQuery = useQuery({
    queryKey: ["sale-returns"],
    queryFn: () => apiFetch<SaleReturnSummary[]>("/sales/returns"),
    enabled: activeTab === "returns",
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => apiFetch<PaymentMethodItem[]>("/payment-methods"),
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiFetch(`/sales/${id}/void`, { method: "POST", body: { reason } }),
    onSuccess: () => {
      toast.success("Sale cancelled.");
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Void failed."),
  });

  const refundMutation = useMutation({
    mutationFn: () => {
      if (!refundSale) {
        throw new Error("No sale selected.");
      }
      const items = refundLines
        .filter((line) => Number(line.quantity) > 0)
        .map((line) => ({
          sale_item_id: line.sale_item_id,
          quantity: line.quantity,
          condition: line.condition,
        }));

      return apiFetch<SaleReturnSummary>(`/sales/${refundSale.id}/refund`, {
        method: "POST",
        idempotencyKey: crypto.randomUUID(),
        body: {
          reason: refundReason,
          refund_method_id: refundMethodId
            ? Number(refundMethodId)
            : paymentMethodsQuery.data?.data[0]?.id ?? null,
          items,
        },
      });
    },
    onSuccess: () => {
      toast.success("Sale return & refund processed.");
      setRefundSale(null);
      setRefundReason("");
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
      void queryClient.invalidateQueries({ queryKey: ["sale-returns"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Refund failed."),
  });

  const openReceipt = async (saleId: number) => {
    try {
      const res = await apiFetch<ReceiptPayload>(`/sales/${saleId}/receipt?paper_size=80mm`);
      setReceipt(res.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load receipt.");
    }
  };

  const openRefundModal = (sale: SaleSummary) => {
    const lines: RefundDraftLine[] = (sale.items ?? []).map((item) => {
      const returned = (item.return_items ?? []).reduce(
        (sum, r) => sum + Number.parseFloat(r.quantity),
        0
      );
      const remaining = Math.max(0, Number.parseFloat(item.quantity) - returned);
      return {
        sale_item_id: item.id,
        name: item.product_name_snapshot,
        sku: item.sku_snapshot,
        remaining,
        quantity: remaining > 0 ? String(remaining) : "0",
        condition: "resellable",
      };
    });
    setRefundLines(lines);
    setRefundReason("");
    setRefundSale(sale);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Management</h1>
          <p className="text-sm text-muted-foreground">
            Immutable sales ledger with receipt reprinting, returns/refunds, and authorized void.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === "sales" ? "default" : "outline"}
            onClick={() => setActiveTab("sales")}
          >
            Transactions
          </Button>
          <Button
            size="sm"
            variant={activeTab === "returns" ? "default" : "outline"}
            onClick={() => setActiveTab("returns")}
          >
            Returns & Refunds
          </Button>
          {activeTab === "sales" && (
            <select
              aria-label="Filter sale status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="held">Held</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="partially_refunded">Partially Refunded</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>
      </div>

      {activeTab === "sales" ? (
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {salesQuery.isLoading ? (
              <div className="h-24 animate-pulse rounded-md bg-muted" />
            ) : (salesQuery.data?.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales transactions yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {(salesQuery.data?.data ?? []).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold">
                        {sale.transaction_number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sale.cashier?.name ?? "Cashier"} • {sale.customer?.name ?? "Walk-in"} •{" "}
                        {formatCurrency(sale.grand_total)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sale.status === "paid" ? "success" : "warning"}>
                        {sale.status}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => openReceipt(sale.id)}>
                        <Printer className="h-3.5 w-3.5" /> Receipt
                      </Button>
                      {(sale.status === "paid" || sale.status === "partially_refunded") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRefundModal(sale)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Refund
                        </Button>
                      )}
                      {sale.status !== "cancelled" && sale.status !== "refunded" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            voidMutation.mutate({
                              id: sale.id,
                              reason: "Authorized void from backoffice",
                            })
                          }
                        >
                          Void
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sale Returns & Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            {returnsQuery.isLoading ? (
              <div className="h-24 animate-pulse rounded-md bg-muted" />
            ) : (returnsQuery.data?.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No sale returns recorded yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {(returnsQuery.data?.data ?? []).map((ret) => (
                  <div
                    key={ret.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold">{ret.return_number}</div>
                      <div className="text-xs text-muted-foreground">
                        Ref: {ret.sale?.transaction_number ?? `#${ret.id}`} • {ret.reason}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold">
                        {formatCurrency(ret.refund_amount)}
                      </span>
                      <Badge variant="success">{ret.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {refundSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-semibold">
              Process Return & Refund — {refundSale.transaction_number}
            </h3>

            <div className="space-y-2 max-h-60 overflow-auto">
              {refundLines.map((line, idx) => (
                <div
                  key={line.sale_item_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-xs"
                >
                  <div>
                    <div className="font-medium">{line.name}</div>
                    <div className="text-muted-foreground font-mono">
                      {line.sku} • Max refundable: {line.remaining}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max={line.remaining}
                      value={line.quantity}
                      onChange={(e) =>
                        setRefundLines((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, quantity: e.target.value } : item
                          )
                        )
                      }
                      className="h-8 w-20 font-mono"
                    />
                    <select
                      aria-label="Return item condition"
                      value={line.condition}
                      onChange={(e) =>
                        setRefundLines((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  condition: e.target.value as "resellable" | "damaged",
                                }
                              : item
                          )
                        )
                      }
                      className="h-8 rounded-md border border-border bg-card px-2"
                    >
                      <option value="resellable">Resellable (Restock)</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Refund Method</label>
                <select
                  aria-label="Refund payment method"
                  value={refundMethodId || String(paymentMethodsQuery.data?.data[0]?.id ?? "")}
                  onChange={(e) => setRefundMethodId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm"
                >
                  {(paymentMethodsQuery.data?.data ?? []).map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Reason</label>
                <Input
                  placeholder="Return reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="mt-1 h-9"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRefundSale(null)}>
                Cancel
              </Button>
              <Button
                disabled={refundMutation.isPending || refundReason.trim().length < 3}
                onClick={() => refundMutation.mutate()}
              >
                Confirm Refund
              </Button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-semibold">Reprint Receipt — {receipt.transaction_number}</h3>
            <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
              {receipt.thermal_text}
            </pre>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                Print
              </Button>
              <Button onClick={() => setReceipt(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
