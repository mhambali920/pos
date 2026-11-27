"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import type { SupplierItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export default function SuppliersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierItem | null>(null);
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
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed."),
  });

  const suppliers = suppliersQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading as="h1" size="xl" weight="semibold">
            Suppliers
          </Heading>
          <Text size="sm" variant="muted" className="mt-0.5">
            Manage vendor directory, payment terms, and outstanding balances.
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftAdornment={<Search className="h-4 w-4" />}
            wrapperClassName="w-64"
          />
          <Button
            variant="solid"
            color="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={openCreate}
          >
            Add Supplier
          </Button>
        </div>
      </div>

      {suppliersQuery.isLoading ? (
        <div className="space-y-2.5">
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          variant="bordered"
          icon={<Building2 className="h-6 w-6" />}
          title="No suppliers found"
          description="Add your first vendor to manage purchasing and balances."
          action={
            <Button variant="solid" color="primary" size="sm" onClick={openCreate}>
              Add Supplier
            </Button>
          }
        />
      ) : (
        <Table variant="hoverable" containerClassName="rounded-xl border border-eta-border">
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Terms</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.code}</TableCell>
                <TableCell className="font-medium">{s.company_name}</TableCell>
                <TableCell className="text-eta-muted">
                  {s.contact_person ?? "—"} {s.phone ? `(${s.phone})` : ""}
                </TableCell>
                <TableCell>
                  <Badge variant="soft" color="neutral">
                    NET {s.payment_terms_days}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono font-medium">
                  {formatCurrency(s.balance)}
                </TableCell>
                <TableCell align="right">
                  <div className="inline-flex items-center gap-1">
                    <IconButton
                      icon={<Pencil className="h-4 w-4" />}
                      variant="ghost"
                      size="sm"
                      aria-label="Edit supplier"
                      onClick={() => openEdit(s)}
                    />
                    <IconButton
                      icon={<Trash2 className="h-4 w-4 text-eta-danger" />}
                      variant="ghost"
                      size="sm"
                      aria-label="Delete supplier"
                      onClick={() => setDeleteTarget(s)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2">
            <FormField label="Code">
              <Input
                id="sup-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SUP-001"
              />
            </FormField>
            <FormField label="Payment Terms (Days)">
              <Input
                id="sup-terms"
                type="number"
                min="0"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(e.target.value)}
              />
            </FormField>
            <FormField label="Company Name" className="sm:col-span-2">
              <Input
                id="sup-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="PT Sumber Makmur"
              />
            </FormField>
            <FormField label="Contact Person">
              <Input
                id="sup-contact"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </FormField>
            <FormField label="Phone">
              <Input id="sup-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormField>
            <FormField label="Email">
              <Input
                id="sup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              disabled={!code.trim() || !companyName.trim()}
              onClick={() => saveMutation.mutate()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent intent="danger">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-eta-heading">{deleteTarget?.company_name}</span>?
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
