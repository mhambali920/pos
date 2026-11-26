"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, Receipt, RotateCcw } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Divider,
  EmptyState,
  FormField,
  Heading,
  Input,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
  useToast,
} from "@eta-ui/react";
import { apiFetch, ApiError } from "@/lib/api";
import { printThermalReceipt } from "@/lib/print-receipt";
import type {
  PaymentMethodItem,
  ReceiptPayload,
  SaleReturnSummary,
  SaleSummary,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface RefundDraftLine {
  sale_item_id: number;
  name: string;
  sku: string;
  remaining: number;
  quantity: string;
  condition: "resellable" | "damaged";
}

export default function SalesHistoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"sales" | "returns">("sales");
  const [statusFilter, setStatusFilter] = useState("");
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const [receiptSaleId, setReceiptSaleId] = useState<number | null>(null);
  const [paperSize, setPaperSize] = useState<"58mm" | "80mm">("80mm");

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

  const openReceipt = async (saleId: number, targetPaperSize: "58mm" | "80mm" = paperSize) => {
    try {
      const res = await apiFetch<ReceiptPayload>(
        `/sales/${saleId}/receipt?paper_size=${targetPaperSize}`
      );
      setReceiptSaleId(saleId);
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

  const sales = salesQuery.data?.data ?? [];
  const returns = returnsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading as="h1" size="xl" weight="semibold">
            Sales Management
          </Heading>
          <Text size="sm" variant="muted" className="mt-0.5">
            Immutable sales ledger with receipt reprinting, returns/refunds, and authorized void.
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            variant="underline"
            size="sm"
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "sales" | "returns")}
          >
            <TabsList>
              <TabsTrigger value="sales">Transactions</TabsTrigger>
              <TabsTrigger value="returns">Returns &amp; Refunds</TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === "sales" && (
            <Select
              value={statusFilter || "all"}
              onValueChange={(v) => setStatusFilter(!v || v === "all" ? "" : v)}
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="held">Held</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {activeTab === "sales" ? (
        <Card variant="elevated" padding="none">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardBody>
            {salesQuery.isLoading ? (
              <div className="space-y-2 p-6 pt-0">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} variant="rounded" height={48} />
                ))}
              </div>
            ) : sales.length === 0 ? (
              <div className="p-6 pt-0">
                <EmptyState
                  variant="bordered"
                  icon={<Receipt className="h-6 w-6" />}
                  title="No sales transactions yet"
                  description="Completed or held POS transactions will appear here."
                />
              </div>
            ) : (
              <Table variant="hoverable" size="sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction #</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead align="right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {sale.transaction_number}
                      </TableCell>
                      <TableCell className="text-xs text-eta-muted">
                        {sale.cashier?.name ?? "Cashier"}
                      </TableCell>
                      <TableCell className="text-xs text-eta-muted">
                        {sale.customer?.name ?? "Walk-in"}
                      </TableCell>
                      <TableCell align="right" className="font-mono text-xs font-semibold">
                        {formatCurrency(sale.grand_total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="soft"
                          color={
                            sale.status === "paid"
                              ? "success"
                              : sale.status === "cancelled"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Printer className="h-3.5 w-3.5" />}
                            onClick={() => openReceipt(sale.id)}
                          >
                            Receipt
                          </Button>
                          {(sale.status === "paid" || sale.status === "partially_refunded") && (
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                              onClick={() => openRefundModal(sale)}
                            >
                              Refund
                            </Button>
                          )}
                          {sale.status !== "cancelled" && sale.status !== "refunded" && (
                            <Button
                              size="sm"
                              variant="soft"
                              color="danger"
                              isLoading={voidMutation.isPending}
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card variant="elevated" padding="none">
          <CardHeader className="px-6 pt-5 pb-3">
            <CardTitle>Sale Returns &amp; Refunds</CardTitle>
          </CardHeader>
          <CardBody>
            {returnsQuery.isLoading ? (
              <div className="space-y-2 p-6 pt-0">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} variant="rounded" height={48} />
                ))}
              </div>
            ) : returns.length === 0 ? (
              <div className="p-6 pt-0">
                <EmptyState
                  variant="bordered"
                  icon={<RotateCcw className="h-6 w-6" />}
                  title="No sale returns recorded yet"
                  description="Processed refunds and returned items will appear here."
                />
              </div>
            ) : (
              <Table variant="hoverable" size="sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Reference Sale</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead align="right">Refund Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {ret.return_number}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-eta-muted">
                        {ret.sale?.transaction_number ?? `#${ret.id}`}
                      </TableCell>
                      <TableCell className="text-xs text-eta-muted">{ret.reason}</TableCell>
                      <TableCell align="right" className="font-mono text-xs font-semibold">
                        {formatCurrency(ret.refund_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="soft" color="success">
                          {ret.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      <Dialog open={Boolean(refundSale)} onOpenChange={(o) => !o && setRefundSale(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              Process Return &amp; Refund — {refundSale?.transaction_number}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <div className="max-h-60 space-y-2 overflow-auto">
              {refundLines.map((line, idx) => (
                <div
                  key={line.sale_item_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-eta-border p-2.5 text-xs"
                >
                  <div>
                    <div className="font-medium text-eta-heading">{line.name}</div>
                    <div className="font-mono text-eta-muted">
                      {line.sku} • Max refundable: {line.remaining}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      size="sm"
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
                      className="w-20 font-mono"
                    />
                    <Select
                      value={line.condition}
                      onValueChange={(v) =>
                        setRefundLines((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  condition: (v as "resellable" | "damaged") ?? "resellable",
                                }
                              : item
                          )
                        )
                      }
                    >
                      <SelectTrigger size="sm" className="w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resellable">Resellable (Restock)</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <Divider spacing="none" />

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Refund Method">
                <Select
                  value={refundMethodId || String(paymentMethodsQuery.data?.data[0]?.id ?? "")}
                  onValueChange={(v) => setRefundMethodId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {(paymentMethodsQuery.data?.data ?? []).map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Reason" isRequired>
                <Input
                  placeholder="Return reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
              </FormField>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundSale(null)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="primary"
              isLoading={refundMutation.isPending}
              disabled={refundMutation.isPending || refundReason.trim().length < 3}
              onClick={() => refundMutation.mutate()}
            >
              Confirm Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(receipt)}
        onOpenChange={(o) => {
          if (!o) {
            setReceipt(null);
            setReceiptSaleId(null);
          }
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Reprint Receipt — {receipt?.transaction_number}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="flex items-center justify-between">
              <Text size="xs" variant="muted">
                Paper Size
              </Text>
              <SegmentedControl
                type="single"
                variant="segmented"
                size="sm"
                value={paperSize}
                onValueChange={(val) => {
                  if (val === "58mm" || val === "80mm") {
                    setPaperSize(val);
                    if (receiptSaleId !== null) {
                      void openReceipt(receiptSaleId, val);
                    }
                  }
                }}
              >
                <SegmentedControlItem value="58mm">58mm</SegmentedControlItem>
                <SegmentedControlItem value="80mm">80mm</SegmentedControlItem>
              </SegmentedControl>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg bg-eta-subtle p-3 font-mono text-xs whitespace-pre-wrap text-eta-heading">
              {receipt?.thermal_text}
            </pre>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => {
                if (receipt) {
                  printThermalReceipt(
                    receipt.thermal_text,
                    receipt.paper_size,
                    receipt.transaction_number
                  );
                }
              }}
            >
              Print
            </Button>
            <Button
              variant="solid"
              color="primary"
              onClick={() => {
                setReceipt(null);
                setReceiptSaleId(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
