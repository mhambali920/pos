"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { StoreSummary } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const queryClient = useQueryClient();

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
          <h1 className="text-2xl font-semibold tracking-tight">Settings &amp; Outlets</h1>
          <p className="text-sm text-muted-foreground">
            Configure stores/outlets, inventory policy flags, and global POS preferences.
          </p>
        </div>
        <Button onClick={openCreateStore}>
          <Plus className="h-4 w-4" /> Add Outlet
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stores / Outlets</CardTitle>
          <CardDescription>Outlets accessible by your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {storesQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          ) : stores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stores configured.</p>
          ) : (
            <div className="divide-y divide-border">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {store.code} — {store.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Timezone: {store.timezone} {store.address ? `• ${store.address}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={store.allow_negative_stock ? "warning" : "success"}>
                      {store.allow_negative_stock ? "Negative Stock Allowed" : "Strict Stock Guard"}
                    </Badge>
                    <Badge variant="muted">{store.status ?? "active"}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit store"
                      onClick={() => openEditStore(store)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Preferences</CardTitle>
          <CardDescription>Organization-level POS &amp; receipt defaults.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Currency Symbol</Label>
            <Input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Default Receipt Footer</Label>
            <Input value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button
              disabled={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate()}
            >
              <Save className="h-4 w-4" /> Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStore ? "Edit Outlet" : "Add New Outlet"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Store Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="STR-002" />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Store Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Branch Bandung" />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label>Allow Negative Stock</Label>
              <Switch checked={allowNegativeStock} onCheckedChange={setAllowNegativeStock} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button
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
