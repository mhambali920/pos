"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Plus, RefreshCw } from "lucide-react";
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
  Skeleton,
  Switch,
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

export default function InventoryPage() {
  const { toast } = useToast();
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
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to create adjustment."),
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
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Transfer creation failed."),
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
          <h1 className="text-2xl font-semibold tracking-tight text-eta-heading">
            Inventory Management
          </h1>
          <p className="text-sm text-eta-muted">
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
            isLoading={reconcileMutation.isPending}
            disabled={reconcileMutation.isPending}
            onClick={() => reconcileMutation.mutate()}
          >
            <RefreshCw className="h-4 w-4" /> Reconcile Ledger
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} variant="underline">
        <TabsList>
          <TabsTrigger value="overview">Stock Overview</TabsTrigger>
          <TabsTrigger value="movements">Movements Ledger</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="expired">Expired Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 pt-2">
          <div className="flex items-center justify-end">
            <Switch
              id="low-stock-toggle"
              label="Low stock only"
              checked={lowStockOnly}
              onCheckedChange={setLowStockOnly}
            />
          </div>
          {overviewQuery.isLoading ? (
            <Skeleton variant="rounded" height={96} />
          ) : (overviewQuery.data?.data ?? []).length === 0 ? (
            <EmptyState
              variant="bordered"
              size="sm"
              title="No stock records found"
              description="Stock balances will appear here once inventory is added."
            />
          ) : (
            <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
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
                      <div className="text-xs text-eta-muted">{item.variant?.name ?? ""}</div>
                    </TableCell>
                    <TableCell className="font-mono">{item.qty_on_hand}</TableCell>
                    <TableCell className="font-mono font-medium">
                      {item.qty_available}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(item.unit_cost ?? "0")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="movements" className="pt-2">
          {movementsQuery.isLoading ? (
            <Skeleton variant="rounded" height={96} />
          ) : (movementsQuery.data?.data ?? []).length === 0 ? (
            <EmptyState
              variant="bordered"
              size="sm"
              title="No movements recorded yet"
              description="Stock movements from sales, purchases, adjustments, and transfers will appear here."
            />
          ) : (
            <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
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
                      <Badge variant="soft" color="neutral">
                        {m.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.variant?.sku ?? "—"}</TableCell>
                    <TableCell className="font-mono">{m.qty_before}</TableCell>
                    <TableCell className="font-mono font-semibold">{m.qty_change}</TableCell>
                    <TableCell className="font-mono">{m.qty_after}</TableCell>
                    <TableCell className="text-xs text-eta-muted">{m.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="adjustments" className="pt-2">
          {(adjustmentsQuery.data?.data ?? []).length === 0 ? (
            <EmptyState
              variant="bordered"
              size="sm"
              title="No stock adjustments yet"
              description="Create a stock adjustment draft to reconcile physical counts."
            />
          ) : (
            <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
              <TableHeader>
                <TableRow>
                  <TableHead>Adjustment #</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(adjustmentsQuery.data?.data ?? []).map((adj) => (
                  <TableRow key={adj.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {adj.adjustment_number}
                    </TableCell>
                    <TableCell>{adj.warehouse?.name ?? "Warehouse"}</TableCell>
                    <TableCell className="text-eta-muted">{adj.reason}</TableCell>
                    <TableCell>
                      <Badge
                        variant="soft"
                        color={adj.status === "approved" ? "success" : "warning"}
                      >
                        {adj.status}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
                      {adj.status === "draft" && (
                        <Button
                          variant="solid"
                          color="primary"
                          size="sm"
                          onClick={() => approveAdjustmentMutation.mutate(adj.id)}
                        >
                          Approve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="transfers" className="pt-2">
          {(transfersQuery.data?.data ?? []).length === 0 ? (
            <EmptyState
              variant="bordered"
              size="sm"
              title="No stock transfers yet"
              description="Create a stock transfer to move inventory between warehouses."
            />
          ) : (
            <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(transfersQuery.data?.data ?? []).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {t.transfer_number}
                    </TableCell>
                    <TableCell className="text-eta-muted">
                      {t.from_warehouse?.name ?? "?"} → {t.to_warehouse?.name ?? "?"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="soft" color={t.status === "received" ? "success" : "warning"}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">
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
                          variant="solid"
                          color="primary"
                          size="sm"
                          onClick={() =>
                            transferActionMutation.mutate({ id: t.id, action: "receive" })
                          }
                        >
                          Receive
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="expired" className="pt-2">
          {(expiredQuery.data?.data ?? []).length === 0 ? (
            <EmptyState
              variant="bordered"
              size="sm"
              title="No expiring batches found"
              description="All tracked batches are within safe expiration windows."
            />
          ) : (
            <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
              <TableHeader>
                <TableRow>
                  <TableHead>Batch #</TableHead>
                  <TableHead>SKU / Product</TableHead>
                  <TableHead align="right">Expiration Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(expiredQuery.data?.data ?? []).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {b.batch_number}
                    </TableCell>
                    <TableCell className="text-eta-muted">
                      {b.sku} — {b.variant_name}
                    </TableCell>
                    <TableCell align="right">
                      <Badge variant="soft" color={b.is_expired ? "danger" : "warning"}>
                        {b.expired_at ?? "—"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Stock Adjustment Draft</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <FormField label="Warehouse">
              <Select
                value={adjWarehouseId || (warehouses[0] ? String(warehouses[0].id) : undefined)}
                onValueChange={(v) => setAdjWarehouseId(v)}
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
            <FormField label="Product / SKU">
              <Select
                value={adjVariantId || (allVariants[0] ? String(allVariants[0].id) : undefined)}
                onValueChange={(v) => setAdjVariantId(v)}
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
            </FormField>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Direction">
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
              </FormField>
              <FormField label="Quantity">
                <Input
                  type="number"
                  min="1"
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                />
              </FormField>
              <FormField label="Unit Cost (Opt)">
                <Input
                  type="number"
                  min="0"
                  value={adjUnitCost}
                  onChange={(e) => setAdjUnitCost(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Reason">
              <Input
                placeholder="e.g. Initial stock count / Damaged goods write-off"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="primary"
              isLoading={createAdjMutation.isPending}
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
          <DialogBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="From Warehouse">
                <Select value={trfFromId || undefined} onValueChange={(v) => setTrfFromId(v)}>
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
              </FormField>
              <FormField label="To Warehouse">
                <Select value={trfToId || undefined} onValueChange={(v) => setTrfToId(v)}>
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
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Product / SKU" className="sm:col-span-2">
                <Select
                  value={trfVariantId || (allVariants[0] ? String(allVariants[0].id) : undefined)}
                  onValueChange={(v) => setTrfVariantId(v)}
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
              </FormField>
              <FormField label="Quantity">
                <Input
                  type="number"
                  min="1"
                  value={trfQty}
                  onChange={(e) => setTrfQty(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Notes">
              <Input value={trfNotes} onChange={(e) => setTrfNotes(e.target.value)} />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrfOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="primary"
              isLoading={createTransferMutation.isPending}
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
