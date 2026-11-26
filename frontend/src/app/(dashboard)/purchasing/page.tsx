"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
  EmptyState,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "@eta-ui/react";
import { IsoDatePicker } from "@/components/shared/iso-date-picker";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  GoodsReceiptSummary,
  ProductItem,
  PurchaseInvoiceSummary,
  PurchaseOrderSummary,
  PurchaseReturnSummary,
  SupplierItem,
  WarehouseItem,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function PurchasingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("orders");

  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [variantId, setVariantId] = useState("");
  const [qtyOrdered, setQtyOrdered] = useState("10");
  const [unitPrice, setUnitPrice] = useState("10000");

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

  const suppliersQuery = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<SupplierItem[]>("/suppliers"),
  });

  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<WarehouseItem[]>("/warehouses"),
  });

  const productsQuery = useQuery({
    queryKey: ["products-for-po"],
    queryFn: () => apiFetch<ProductItem[]>("/products"),
  });

  const suppliers = suppliersQuery.data?.data ?? [];
  const warehouses = warehousesQuery.data?.data ?? [];
  const variants = (productsQuery.data?.data ?? []).flatMap((p) =>
    p.variants.map((v) => ({ id: v.id, label: `${v.sku} — ${v.name || p.name}` }))
  );

  const createPoMutation = useMutation({
    mutationFn: () =>
      apiFetch("/purchasing/orders", {
        method: "POST",
        body: {
          supplier_id: Number(supplierId || suppliers[0]?.id),
          warehouse_id: Number(warehouseId || warehouses[0]?.id),
          order_date: orderDate || undefined,
          expected_date: expectedDate || null,
          items: [
            {
              product_variant_id: Number(variantId || variants[0]?.id),
              qty_ordered: qtyOrdered,
              unit_price: unitPrice,
            },
          ],
        },
      }),
    onSuccess: () => {
      toast.success("Purchase order created.");
      setPoDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["purchasing-orders"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to create PO."),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-eta-heading">
            Purchasing Management
          </h1>
          <p className="text-sm text-eta-muted">
            End-to-end procurement: Purchase Orders, Goods Receipts, Supplier Invoices, and Returns.
          </p>
        </div>
        <Button variant="solid" color="primary" onClick={() => setPoDialogOpen(true)}>
          <Plus className="h-4 w-4" /> New Purchase Order
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} variant="underline">
        <TabsList>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="receipts">Goods Receipts</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-eta-border">
              {(ordersQuery.data?.data ?? []).length === 0 ? (
                <EmptyState
                  variant="bordered"
                  size="sm"
                  title="No purchase orders yet"
                  description="Create a purchase order to start procuring stock from suppliers."
                />
              ) : (
                (ordersQuery.data?.data ?? []).map((po) => (
                  <div
                    key={po.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold">{po.po_number}</div>
                      <div className="text-xs text-eta-muted">
                        {po.supplier?.company_name ?? "Supplier"} • {po.order_date} •{" "}
                        {formatCurrency(po.grand_total)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="soft"
                        color={po.status === "approved" ? "success" : "warning"}
                      >
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
                      {(po.status === "draft" || po.status === "pending_approval") && (
                        <Button
                          variant="solid"
                          color="primary"
                          size="sm"
                          onClick={() => poActionMutation.mutate({ id: po.id, action: "approve" })}
                        >
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <CardTitle>Goods Receipts (GRN)</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-eta-border">
              {(receiptsQuery.data?.data ?? []).length === 0 ? (
                <EmptyState
                  variant="bordered"
                  size="sm"
                  title="No goods receipts yet"
                  description="Goods receipts will appear here once deliveries are recorded."
                />
              ) : (
                (receiptsQuery.data?.data ?? []).map((grn) => (
                  <div
                    key={grn.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold">{grn.grn_number}</div>
                      <div className="text-xs text-eta-muted">
                        PO: {grn.purchase_order?.po_number ?? "—"} • {grn.warehouse?.name ?? "WH"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="soft"
                        color={grn.status === "confirmed" ? "success" : "warning"}
                      >
                        {grn.status}
                      </Badge>
                      {grn.status === "draft" && (
                        <Button
                          variant="solid"
                          color="primary"
                          size="sm"
                          onClick={() => confirmGrnMutation.mutate(grn.id)}
                        >
                          Confirm
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Invoices</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-eta-border">
              {(invoicesQuery.data?.data ?? []).length === 0 ? (
                <EmptyState
                  variant="bordered"
                  size="sm"
                  title="No supplier invoices yet"
                  description="Supplier invoices will appear here once billed."
                />
              ) : (
                (invoicesQuery.data?.data ?? []).map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold">{inv.invoice_number}</div>
                      <div className="text-xs text-eta-muted">
                        {inv.supplier?.company_name ?? "Supplier"} • Due {inv.due_date}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span>
                        Paid {formatCurrency(inv.paid_amount)} / {formatCurrency(inv.grand_total)}
                      </span>
                      <Badge
                        variant="soft"
                        color={inv.payment_status === "paid" ? "success" : "warning"}
                      >
                        {inv.payment_status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </TabsContent>

        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Returns</CardTitle>
            </CardHeader>
            <CardBody className="divide-y divide-eta-border">
              {(returnsQuery.data?.data ?? []).length === 0 ? (
                <EmptyState
                  variant="bordered"
                  size="sm"
                  title="No purchase returns yet"
                  description="Purchase returns will appear here when items are returned to suppliers."
                />
              ) : (
                (returnsQuery.data?.data ?? []).map((ret) => (
                  <div
                    key={ret.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold">{ret.return_number}</div>
                      <div className="text-xs text-eta-muted">
                        {ret.supplier?.company_name ?? "Supplier"} • {ret.reason}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{formatCurrency(ret.total_amount)}</span>
                      <Badge
                        variant="soft"
                        color={ret.status === "confirmed" ? "success" : "warning"}
                      >
                        {ret.status}
                      </Badge>
                      {ret.status === "draft" && (
                        <Button
                          variant="solid"
                          color="primary"
                          size="sm"
                          onClick={() => confirmReturnMutation.mutate(ret.id)}
                        >
                          Confirm
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2">
            <FormField label="Supplier">
              <Select
                value={supplierId || (suppliers[0] ? String(suppliers[0].id) : undefined)}
                onValueChange={(v) => setSupplierId(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.code} — {s.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Warehouse">
              <Select
                value={warehouseId || (warehouses[0] ? String(warehouses[0].id) : undefined)}
                onValueChange={(v) => setWarehouseId(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.code} — {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Order Date">
              <IsoDatePicker
                value={orderDate}
                onChange={setOrderDate}
                placeholder="Select order date"
                allowClear
              />
            </FormField>
            <FormField label="Expected Date">
              <IsoDatePicker
                value={expectedDate}
                onChange={setExpectedDate}
                placeholder="Select expected date"
                allowClear
              />
            </FormField>
            <FormField label="Product / SKU" className="sm:col-span-2">
              <Select
                value={variantId || (variants[0] ? String(variants[0].id) : undefined)}
                onValueChange={(v) => setVariantId(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Qty Ordered">
              <Input
                type="number"
                min="1"
                value={qtyOrdered}
                onChange={(e) => setQtyOrdered(e.target.value)}
              />
            </FormField>
            <FormField label="Unit Cost">
              <Input
                type="number"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="primary"
              isLoading={createPoMutation.isPending}
              disabled={createPoMutation.isPending || suppliers.length === 0 || variants.length === 0}
              onClick={() => createPoMutation.mutate()}
            >
              Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
