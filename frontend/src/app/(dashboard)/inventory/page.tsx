"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  ExpiredBatchAlert,
  InventoryStockItem,
  ProductItem,
  StockAdjustmentItem,
  StockMovementItem,
  StockTransferItem,
  WarehouseItem,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [adjOpen, setAdjOpen] = useState(false);
  const [adjWarehouseId, setAdjWarehouseId] = useState("");
  const [adjVariantId, setAdjVariantId] = useState("");
  const [adjDirection, setAdjDirection] = useState<"in" | "out">("in");
  const [adjQty, setAdjQty] = useState("1");
  const [adjUnitCost, setAdjUnitCost] = useState("");
  const [adjReason, setAdjReason] = useState("");

  const [trfOpen, setTrfOpen] = useState(false);
  const [trfFromId, setTrfFromId] = useState("");
  const [trfToId, setTrfToId] = useState("");
  const [trfVariantId, setTrfVariantId] = useState("");
  const [trfQty, setTrfQty] = useState("1");
  const [trfNotes, setTrfNotes] = useState("");

  const overviewQuery = useQuery({
    queryKey: ["inventory-overview", lowStockOnly],
    queryFn: () =>
      apiFetch<InventoryStockItem[]>(`/inventory${lowStockOnly ? "?low_stock_only=1" : ""}`),
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

  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<WarehouseItem[]>("/warehouses"),
  });

  const productsQuery = useQuery({
    queryKey: ["products-for-inventory"],
    queryFn: () => apiFetch<ProductItem[]>("/products"),
  });

  const allVariants = (productsQuery.data?.data ?? []).flatMap((p) =>
    p.variants.map((v) => ({ id: v.id, label: `${v.sku} — ${v.name || p.name}` }))
  );
  const warehouses = warehousesQuery.data?.data ?? [];

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
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Reconciliation failed."),
  });

  const createAdjMutation = useMutation({
    mutationFn: () =>
      apiFetch("/inventory/adjustments", {
        method: "POST",
        body: {
          warehouse_id: Number(adjWarehouseId || warehouses[0]?.id),
          reason: adjReason.trim(),
          items: [
            {
              product_variant_id: Number(adjVariantId || allVariants[0]?.id),
              direction: adjDirection,
              quantity: adjQty,
              unit_cost: adjUnitCost ? adjUnitCost : null,
            },
          ],
        },
      }),
    onSuccess: () => {
      toast.success("Stock adjustment draft created.");
      setAdjOpen(false);
      setAdjReason("");
      void queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to create adjustment."),
  });

  const approveAdjustmentMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/inventory/adjustments/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Stock adjustment approved.");
      void queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Approval failed."),
  });

  const createTransferMutation = useMutation({
    mutationFn: () =>
      apiFetch("/inventory/transfers", {
        method: "POST",
        body: {
          from_warehouse_id: Number(trfFromId),
          to_warehouse_id: Number(trfToId),
          notes: trfNotes || null,
          items: [
            {
              product_variant_id: Number(trfVariantId || allVariants[0]?.id),
              quantity: trfQty,
            },
          ],
        },
      }),
    onSuccess: () => {
      toast.success("Stock transfer draft created.");
      setTrfOpen(false);
      setTrfNotes("");
      void queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Transfer creation failed."),
  });

  const transferActionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "ship" | "receive" }) =>
      apiFetch(`/inventory/transfers/${id}/${action}`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Transfer status updated.");
      void queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-overview"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Transfer action failed."),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">
            Ledger-backed stock tracking, adjustments, inter-warehouse transfers, and reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setAdjOpen(true)}>
            <Plus className="h-4 w-4" /> New Adjustment
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTrfOpen(true)}>
            <ArrowLeftRight className="h-4 w-4" /> New Transfer
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={reconcileMutation.isPending}
            onClick={() => reconcileMutation.mutate()}
          >
            <RefreshCw className="h-4 w-4" /> Reconcile Ledger
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Stock Overview</TabsTrigger>
          <TabsTrigger value="movements">Movements Ledger</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="expired">Expired Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Current Stock Balances</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="low-stock-toggle">Low stock only</Label>
                <Switch
                  id="low-stock-toggle"
                  checked={lowStockOnly}
                  onCheckedChange={setLowStockOnly}
                />
              </div>
            </CardHeader>
            <CardContent>
              {overviewQuery.isLoading ? (
                <div className="h-24 animate-pulse rounded-md bg-muted" />
              ) : (overviewQuery.data?.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No stock records found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>SKU / Product</TableHead>
                      <TableHead>On Hand</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>MAC Unit Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(overviewQuery.data?.data ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.warehouse?.name ?? "—"}</TableCell>
                        <TableCell>
                          <div className="font-mono text-xs">{item.variant?.sku ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.variant?.name ?? ""}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{item.qty_on_hand}</TableCell>
                        <TableCell className="font-mono font-medium">
                          {item.qty_available}
                        </TableCell>
                        <TableCell className="font-mono">{formatCurrency(item.unit_cost ?? "0")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Immutable Stock Movements Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              {movementsQuery.isLoading ? (
                <div className="h-24 animate-pulse rounded-md bg-muted" />
              ) : (movementsQuery.data?.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No movements recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Before</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>After</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(movementsQuery.data?.data ?? []).map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Badge variant="muted">{m.movement_type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{m.variant?.sku ?? "—"}</TableCell>
                        <TableCell className="font-mono">{m.qty_before}</TableCell>
                        <TableCell className="font-mono font-semibold">{m.qty_change}</TableCell>
                        <TableCell className="font-mono">{m.qty_after}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments">
          <Card>
            <CardHeader>
              <CardTitle>Stock Adjustments</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {(adjustmentsQuery.data?.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No stock adjustments yet.</p>
              ) : (
                (adjustmentsQuery.data?.data ?? []).map((adj) => (
                  <div
                    key={adj.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold">{adj.adjustment_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {adj.warehouse?.name ?? "Warehouse"} • {adj.reason}
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
                        >
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader>
              <CardTitle>Inter-Warehouse Transfers</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {(transfersQuery.data?.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No stock transfers yet.</p>
              ) : (
                (transfersQuery.data?.data ?? []).map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold">{t.transfer_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.from_warehouse?.name ?? "?"} → {t.to_warehouse?.name ?? "?"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.status === "received" ? "success" : "warning"}>
                        {t.status}
                      </Badge>
                      {t.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => transferActionMutation.mutate({ id: t.id, action: "ship" })}
                        >
                          Ship
                        </Button>
                      )}
                      {t.status === "in_transit" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            transferActionMutation.mutate({ id: t.id, action: "receive" })
                          }
                        >
                          Receive
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired">
          <Card>
            <CardHeader>
              <CardTitle>Expired / Near-Expiry Batches (30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {(expiredQuery.data?.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No expiring batches found.</p>
              ) : (
                (expiredQuery.data?.data ?? []).map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <div className="font-mono text-xs font-semibold">{b.batch_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.sku} — {b.variant_name}
                      </div>
                    </div>
                    <Badge variant={b.is_expired ? "destructive" : "warning"}>
                      {b.expired_at ?? "—"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Stock Adjustment Draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Warehouse</Label>
              <Select
                value={adjWarehouseId || String(warehouses[0]?.id ?? "")}
                onValueChange={(v) => setAdjWarehouseId(v ?? "")}
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
            </div>
            <div className="space-y-1.5">
              <Label>Product / SKU</Label>
              <Select
                value={adjVariantId || String(allVariants[0]?.id ?? "")}
                onValueChange={(v) => setAdjVariantId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {allVariants.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Direction</Label>
                <Select
                  value={adjDirection}
                  onValueChange={(v) => setAdjDirection((v as "in" | "out") ?? "in")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Stock In (+)</SelectItem>
                    <SelectItem value="out">Stock Out (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Cost (Opt)</Label>
                <Input
                  type="number"
                  min="0"
                  value={adjUnitCost}
                  onChange={(e) => setAdjUnitCost(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input
                placeholder="e.g. Initial stock count / Damaged goods write-off"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createAdjMutation.isPending || !adjReason.trim()}
              onClick={() => createAdjMutation.mutate()}
            >
              Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trfOpen} onOpenChange={setTrfOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Stock Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>From Warehouse</Label>
                <Select value={trfFromId} onValueChange={(v) => setTrfFromId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Source WH" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.code} — {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To Warehouse</Label>
                <Select value={trfToId} onValueChange={(v) => setTrfToId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Destination WH" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.code} — {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Product / SKU</Label>
                <Select
                  value={trfVariantId || String(allVariants[0]?.id ?? "")}
                  onValueChange={(v) => setTrfVariantId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {allVariants.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={trfQty}
                  onChange={(e) => setTrfQty(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={trfNotes} onChange={(e) => setTrfNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrfOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createTransferMutation.isPending || !trfFromId || !trfToId}
              onClick={() => createTransferMutation.mutate()}
            >
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
