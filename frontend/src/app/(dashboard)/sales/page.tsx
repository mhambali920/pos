"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { ReceiptPayload, SaleSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SalesHistoryPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);

  const salesQuery = useQuery({
    queryKey: ["sales", statusFilter],
    queryFn: () =>
      apiFetch<SaleSummary[]>(
        `/sales${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""}`
      ),
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

  const openReceipt = async (saleId: number) => {
    try {
      const res = await apiFetch<ReceiptPayload>(`/sales/${saleId}/receipt?paper_size=80mm`);
      setReceipt(res.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load receipt.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Management</h1>
          <p className="text-sm text-muted-foreground">
            Immutable sales ledger with receipt reprinting and authorized void workflow.
          </p>
        </div>

        <select
          aria-label="Filter sale status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="held">Held</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="partially_refunded">Partially Refunded</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

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
                    <div className="font-mono text-xs font-semibold">{sale.transaction_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {sale.cashier?.name ?? "Cashier"} • {sale.customer?.name ?? "Walk-in"} •{" "}
                      {formatCurrency(sale.grand_total)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sale.status === "paid" ? "success" : "warning"}>
                      {sale.status}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => openReceipt(sale.id)}>
                      <Printer className="h-3.5 w-3.5" /> Receipt
                    </Button>
                    {sale.status !== "cancelled" && (
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
