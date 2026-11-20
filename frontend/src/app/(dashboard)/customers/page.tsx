"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import type { CustomerItem } from "@/lib/types";
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

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerItem | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [customerType, setCustomerType] = useState("registered");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [creditLimit, setCreditLimit] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const [loyaltyCustomer, setLoyaltyCustomer] = useState<CustomerItem | null>(null);
  const [loyaltyType, setLoyaltyType] = useState("earn");
  const [loyaltyPoints, setLoyaltyPoints] = useState("10");
  const [loyaltyNotes, setLoyaltyNotes] = useState("");

  const customersQuery = useQuery({
    queryKey: ["customers", search, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter && typeFilter !== "all") params.set("customer_type", typeFilter);
      const qs = params.toString();
      return apiFetch<CustomerItem[]>(`/customers${qs ? `?${qs}` : ""}`);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setCode("");
    setName("");
    setCustomerType("registered");
    setPhone("");
    setEmail("");
    setCreditLimit("0");
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (c: CustomerItem) => {
    setEditing(c);
    setCode(c.code);
    setName(c.name);
    setCustomerType(c.customer_type);
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setCreditLimit(c.credit_limit);
    setIsActive(c.is_active);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        code: code.trim(),
        name: name.trim(),
        customer_type: customerType,
        phone: phone || null,
        email: email || null,
        credit_limit: creditLimit || "0",
        is_active: isActive,
      };
      return editing
        ? apiFetch(`/customers/${editing.id}`, { method: "PUT", body })
        : apiFetch("/customers", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success(editing ? "Customer updated." : "Customer created.");
      setDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/customers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Customer deleted.");
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed."),
  });

  const loyaltyMutation = useMutation({
    mutationFn: () => {
      if (!loyaltyCustomer) throw new Error("No customer selected.");
      return apiFetch(`/customers/${loyaltyCustomer.id}/loyalty/adjust`, {
        method: "POST",
        body: {
          type: loyaltyType,
          points: Number(loyaltyPoints),
          notes: loyaltyNotes,
        },
      });
    },
    onSuccess: () => {
      toast.success("Loyalty points updated.");
      setLoyaltyCustomer(null);
      setLoyaltyNotes("");
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Loyalty adjust failed."),
  });

  const customers = customersQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage walk-in, registered, member, and wholesale customers with loyalty &amp; credit limits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, code, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="walk_in">Walk-in</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="wholesale">Wholesale</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {customersQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          ) : customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No customers found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Loyalty</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.phone ?? c.email ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge>{c.customer_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{c.loyalty_points} pts</TableCell>
                    <TableCell className="font-medium font-mono">
                      {formatCurrency(c.credit_limit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Adjust loyalty points"
                          onClick={() => setLoyaltyCustomer(c)}
                        >
                          <Award className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit customer"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete customer"
                          onClick={() => deleteMutation.mutate(c.id)}
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
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CUST-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={customerType} onValueChange={(v) => setCustomerType(v ?? "registered")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer Name" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812..." />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Credit Limit</Label>
              <Input
                type="number"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
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
              disabled={saveMutation.isPending || !code.trim() || !name.trim()}
              onClick={() => saveMutation.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(loyaltyCustomer)} onOpenChange={(o) => !o && setLoyaltyCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loyalty Points — {loyaltyCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-xs text-muted-foreground">
              Current Balance:{" "}
              <span className="font-mono font-semibold text-foreground">
                {loyaltyCustomer?.loyalty_points ?? 0} pts
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Action</Label>
                <Select value={loyaltyType} onValueChange={(v) => setLoyaltyType(v ?? "earn")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earn">Earn (+)</SelectItem>
                    <SelectItem value="redeem">Redeem (-)</SelectItem>
                    <SelectItem value="adjust">Manual Adjust</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Points</Label>
                <Input
                  type="number"
                  value={loyaltyPoints}
                  onChange={(e) => setLoyaltyPoints(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                placeholder="Reason for points update"
                value={loyaltyNotes}
                onChange={(e) => setLoyaltyNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoyaltyCustomer(null)}>
              Cancel
            </Button>
            <Button
              disabled={loyaltyMutation.isPending || loyaltyNotes.trim().length < 3}
              onClick={() => loyaltyMutation.mutate()}
            >
              Update Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
