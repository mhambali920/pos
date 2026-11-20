"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { SupplierItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierItem | null>(null);
  const [code, setCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentTermsDays, setPaymentTermsDays] = useState("30");
  const [isActive, setIsActive] = useState(true);

  const suppliersQuery = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () =>
      apiFetch<SupplierItem[]>(
        `/suppliers${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
  });

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setCompanyName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setPaymentTermsDays("30");
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (s: SupplierItem) => {
    setEditing(s);
    setCode(s.code);
    setCompanyName(s.company_name);
    setContactPerson(s.contact_person ?? "");
    setPhone(s.phone ?? "");
    setEmail(s.email ?? "");
    setPaymentTermsDays(String(s.payment_terms_days));
    setIsActive(s.is_active);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        code: code.trim(),
        company_name: companyName.trim(),
        contact_person: contactPerson || null,
        phone: phone || null,
        email: email || null,
        payment_terms_days: Number(paymentTermsDays || 0),
        is_active: isActive,
      };
      return editing
        ? apiFetch(`/suppliers/${editing.id}`, { method: "PUT", body })
        : apiFetch("/suppliers", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success(editing ? "Supplier updated." : "Supplier created.");
      setDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Supplier deleted.");
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed."),
  });

  const suppliers = suppliersQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage vendor directory, payment terms, and outstanding balances.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliersQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          ) : suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suppliers found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="font-medium">{s.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.contact_person ?? "—"} {s.phone ? `(${s.phone})` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">NET {s.payment_terms_days}</Badge>
                    </TableCell>
                    <TableCell className="font-medium font-mono">
                      {formatCurrency(s.balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit supplier"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete supplier"
                          onClick={() => deleteMutation.mutate(s.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SUP-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms (Days)</Label>
              <Input
                type="number"
                min="0"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Company Name</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="PT Sumber Makmur"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saveMutation.isPending || !code.trim() || !companyName.trim()}
              onClick={() => saveMutation.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
