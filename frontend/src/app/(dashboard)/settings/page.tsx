"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
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
  FormLabel,
  IconButton,
  Input,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from "@eta-ui/react";
import { apiFetch, ApiError } from "@/lib/api";
import type { StoreSummary } from "@/lib/types";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreSummary | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);

  const [receiptFooter, setReceiptFooter] = useState("Thank you for shopping with us!");
  const [currencySymbol, setCurrencySymbol] = useState("Rp");

  const storesQuery = useQuery({
    queryKey: ["stores"],
    queryFn: () => apiFetch<StoreSummary[]>("/stores"),
  });

  const openCreateStore = () => {
    setEditingStore(null);
    setCode("");
    setName("");
    setAddress("");
    setTimezone("Asia/Jakarta");
    setAllowNegativeStock(false);
    setStoreDialogOpen(true);
  };

  const openEditStore = (store: StoreSummary) => {
    setEditingStore(store);
    setCode(store.code);
    setName(store.name);
    setAddress(store.address ?? "");
    setTimezone(store.timezone);
    setAllowNegativeStock(Boolean(store.allow_negative_stock));
    setStoreDialogOpen(true);
  };

  const saveStoreMutation = useMutation({
    mutationFn: () => {
      const body = {
        code: code.trim(),
        name: name.trim(),
        address: address || null,
        timezone: timezone.trim() || "Asia/Jakarta",
        allow_negative_stock: allowNegativeStock,
      };
      return editingStore
        ? apiFetch(`/stores/${editingStore.id}`, { method: "PUT", body })
        : apiFetch("/stores", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success(editingStore ? "Store updated." : "Store created.");
      setStoreDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to save store."),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      apiFetch("/settings", {
        method: "PUT",
        body: {
          settings: [
            { group: "pos", key: "receipt_footer", value: receiptFooter },
            { group: "general", key: "currency_symbol", value: currencySymbol },
          ],
        },
      }),
    onSuccess: () => toast.success("System settings saved."),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Save failed."),
  });

  const stores = storesQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-eta-heading">
            Settings &amp; Outlets
          </h1>
          <p className="text-sm text-eta-muted">
            Configure stores/outlets, inventory policy flags, and global POS preferences.
          </p>
        </div>
        <Button variant="solid" color="primary" onClick={openCreateStore}>
          <Plus className="h-4 w-4" /> Add Outlet
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-eta-heading">Stores / Outlets</h2>
          <p className="text-xs text-eta-muted">Outlets accessible by your account.</p>
        </div>
        {storesQuery.isLoading ? (
          <Skeleton variant="rounded" height={96} />
        ) : stores.length === 0 ? (
          <EmptyState
            variant="bordered"
            size="sm"
            title="No stores configured."
            description="Add an outlet to configure store policies."
          />
        ) : (
          <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Outlet Name</TableHead>
                <TableHead>Timezone &amp; Address</TableHead>
                <TableHead>Stock Policy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-mono text-xs font-semibold">{store.code}</TableCell>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell className="text-xs text-eta-muted">
                    {store.timezone} {store.address ? `• ${store.address}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="soft"
                      color={store.allow_negative_stock ? "warning" : "success"}
                      size="sm"
                    >
                      {store.allow_negative_stock ? "Negative Stock Allowed" : "Strict Stock Guard"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="soft" color="neutral" size="sm">
                      {store.status ?? "active"}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      icon={<Pencil className="h-4 w-4" />}
                      size="sm"
                      variant="ghost"
                      aria-label="Edit store"
                      onClick={() => openEditStore(store)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Preferences</CardTitle>
          <CardDescription>Organization-level POS &amp; receipt defaults.</CardDescription>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <FormField label="Currency Symbol">
            <Input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} />
          </FormField>
          <FormField label="Default Receipt Footer">
            <Input value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} />
          </FormField>
          <div className="sm:col-span-2 flex justify-end">
            <Button
              variant="solid"
              color="primary"
              isLoading={saveSettingsMutation.isPending}
              disabled={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate()}
            >
              <Save className="h-4 w-4" /> Save Settings
            </Button>
          </div>
        </CardBody>
      </Card>

      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editingStore ? "Edit Outlet" : "Add New Outlet"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Store Code">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="STR-002" />
              </FormField>
              <FormField label="Timezone">
                <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Store Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Branch Bandung"
              />
            </FormField>
            <FormField label="Address">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </FormField>
            <div className="flex items-center justify-between rounded-lg border border-eta-border p-3">
              <FormLabel htmlFor="allow-negative-stock">Allow Negative Stock</FormLabel>
              <Switch
                id="allow-negative-stock"
                checked={allowNegativeStock}
                onCheckedChange={setAllowNegativeStock}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="primary"
              isLoading={saveStoreMutation.isPending}
              disabled={saveStoreMutation.isPending || !code.trim() || !name.trim()}
              onClick={() => saveStoreMutation.mutate()}
            >
              Save Outlet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
