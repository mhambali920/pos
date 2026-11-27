"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  Badge,
  Button,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

        <TabsContent value="orders" className="pt-2">
          {(ordersQuery.data?.data ?? []).length === 0 ? (
            <EmptyState
              variant="bordered"
              size="sm"
              title="No purchase orders yet"
              description="Create a purchase order to start procuring stock from suppliers."
            />
          ) : (
            <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead align="right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ordersQuery.data?.data ?? []).map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {po.po_number}
                    </TableCell>
                    <TableCell>{po.supplier?.company_name ?? "Supplier"}</TableCell>
                    <TableCell className="text-xs text-eta-muted">{po.order_date}</TableCell>
                    <TableCell align="right" className="font-mono font-medium">
                      {formatCurrency(po.grand_total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="soft"
                        color={po.status === "approved" ? "success" : "warning"}
                      >
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="receipts" className="pt-2">
          {(receiptsQuery.data?.data ?? []).length === 0 ? (
            <EmptyState
              variant="bordered"
              size="sm"
              title="No goods receipts yet"
              description="Goods receipts will appear here once deliveries are recorded."
            />
          ) : (
            <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
              <TableHeader>
                <TableRow>
                  <TableHead>GRN #</TableHead>
                  <TableHead>PO Reference</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(receiptsQuery.data?.data ?? []).map((grn) => (
                  <TableRow key={grn.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {grn.grn_number}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-eta-muted">
                      {grn.purchase_order?.po_number ?? "—"}
                    </TableCell>
                    <TableCell>{grn.warehouse?.name ?? "WH"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="soft"
                        color={grn.status === "confirmed" ? "success" : "warning"}
                      >
                        {grn.status}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="pt-2">
          {(invoicesQuery.data?.data ?? []).length === 0 ? (
            <EmptyState
              variant="bordered"
              size="sm"
              title="No supplier invoices yet"
              description="Supplier invoices will appear here once billed."
            />
          ) : (
            <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead align="right">Paid / Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoicesQuery.data?.data ?? []).map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell>{inv.supplier?.company_name ?? "Supplier"}</TableCell>
                    <TableCell className="text-xs text-eta-muted">{inv.due_date}</TableCell>
                    <TableCell align="right" className="font-mono text-xs">
                      {formatCurrency(inv.paid_amount)} / {formatCurrency(inv.grand_total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="soft"
                        color={inv.payment_status === "paid" ? "success" : "warning"}
                      >
                        {inv.payment_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="returns" className="pt-2">
          {(returnsQuery.data?.data ?? []).length === 0 ? (
            <EmptyState
              variant="bordered"
              size="sm"
              title="No purchase returns yet"
              description="Purchase returns will appear here when items are returned to suppliers."
            />
          ) : (
            <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead align="right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(returnsQuery.data?.data ?? []).map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {ret.return_number}
                    </TableCell>
                    <TableCell>{ret.supplier?.company_name ?? "Supplier"}</TableCell>
                    <TableCell className="text-eta-muted">{ret.reason}</TableCell>
                    <TableCell align="right" className="font-mono text-xs font-medium">
                      {formatCurrency(ret.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="soft"
                        color={ret.status === "confirmed" ? "success" : "warning"}
                      >
                        {ret.status}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
