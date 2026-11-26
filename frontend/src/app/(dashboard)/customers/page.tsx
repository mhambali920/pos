"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  FormLabel,
  Heading,
  IconButton,
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
  Text,
  useToast,
} from "@eta-ui/react";
import { apiFetch, ApiError } from "@/lib/api";
import type { CustomerItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function CustomersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerItem | null>(null);
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
      setDeleteTarget(null);
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
          <Heading as="h1" size="xl" weight="semibold">
            Customers
          </Heading>
          <Text size="sm" variant="muted" className="mt-0.5">
            Manage walk-in, registered, member, and wholesale customers with loyalty &amp; credit
            limits.
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search name, code, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftAdornment={<Search className="h-4 w-4" />}
            wrapperClassName="w-60"
          />
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
          <Button
            variant="solid"
            color="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={openCreate}
          >
            Add Customer
          </Button>
        </div>
      </div>

      <Card variant="elevated" padding="none">
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle>Customer Directory</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {customersQuery.isLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton variant="rounded" height={48} />
              <Skeleton variant="rounded" height={48} />
              <Skeleton variant="rounded" height={48} />
            </div>
          ) : customers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                variant="bordered"
                icon={<Users className="h-6 w-6" />}
                title="No customers found"
                description="Try adjusting your search or filter, or add a new customer."
                action={
                  <Button variant="solid" color="primary" size="sm" onClick={openCreate}>
                    Add Customer
                  </Button>
                }
              />
            </div>
          ) : (
            <Table variant="hoverable">
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Loyalty</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>
                      <div className="font-medium text-eta-heading">{c.name}</div>
                      <div className="text-xs text-eta-muted">{c.phone ?? c.email ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="solid" color="primary">
                        {c.customer_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{c.loyalty_points} pts</TableCell>
                    <TableCell className="font-mono font-medium">
                      {formatCurrency(c.credit_limit)}
                    </TableCell>
                    <TableCell align="right">
                      <div className="inline-flex items-center gap-1">
                        <IconButton
                          icon={<Award className="h-4 w-4 text-eta-warning" />}
                          variant="ghost"
                          size="sm"
                          aria-label="Adjust loyalty points"
                          onClick={() => setLoyaltyCustomer(c)}
                        />
                        <IconButton
                          icon={<Pencil className="h-4 w-4" />}
                          variant="ghost"
                          size="sm"
                          aria-label="Edit customer"
                          onClick={() => openEdit(c)}
                        />
                        <IconButton
                          icon={<Trash2 className="h-4 w-4 text-eta-danger" />}
                          variant="ghost"
                          size="sm"
                          aria-label="Delete customer"
                          onClick={() => setDeleteTarget(c)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2">
            <FormField label="Code">
              <Input
                id="cust-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CUST-001"
              />
            </FormField>
            <FormField label="Type">
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
            </FormField>
            <FormField label="Full Name" className="sm:col-span-2">
              <Input
                id="cust-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer Name"
              />
            </FormField>
            <FormField label="Phone">
              <Input
                id="cust-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812..."
              />
            </FormField>
            <FormField label="Email">
              <Input
                id="cust-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
            <FormField label="Credit Limit">
              <Input
                id="cust-credit"
                type="number"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </FormField>
            <div className="flex items-center justify-between rounded-lg border border-eta-border p-3">
              <FormLabel>Active</FormLabel>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="primary"
              isLoading={saveMutation.isPending}
              disabled={!code.trim() || !name.trim()}
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
          <DialogBody className="space-y-3">
            <div className="text-xs text-eta-muted">
              Current Balance:{" "}
              <span className="font-mono font-semibold text-eta-heading">
                {loyaltyCustomer?.loyalty_points ?? 0} pts
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Action">
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
              </FormField>
              <FormField label="Points">
                <Input
                  id="loyalty-pts"
                  type="number"
                  value={loyaltyPoints}
                  onChange={(e) => setLoyaltyPoints(e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Notes">
              <Input
                id="loyalty-notes"
                placeholder="Reason for points update"
                value={loyaltyNotes}
                onChange={(e) => setLoyaltyNotes(e.target.value)}
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoyaltyCustomer(null)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="primary"
              isLoading={loyaltyMutation.isPending}
              disabled={loyaltyNotes.trim().length < 3}
              onClick={() => loyaltyMutation.mutate()}
            >
              Update Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent intent="danger">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-eta-heading">{deleteTarget?.name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="solid"
                color="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => {
                  if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                }}
              >
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
