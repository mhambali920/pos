"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  RotateCcw,
  Search,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  FormField,
  Input,
  Kbd,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Skeleton,
  useToast,
} from "@eta-ui/react";
import { apiFetch, ApiError } from "@/lib/api";
import type { CustomerItem } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type CustomerSegment = "all" | "member" | "registered" | "wholesale";
type QuickCustomerType = "registered" | "member" | "wholesale";

export function getCustomerTypeLabel(type: CustomerItem["customer_type"]): string {
  switch (type) {
    case "member":
      return "Member";
    case "wholesale":
      return "Grosir B2B";
    case "registered":
      return "Reguler";
    default:
      return "Walk-in";
  }
}

interface PosCustomerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCustomerId: number | null;
  onSelectCustomer: (customerId: number | null) => void;
  customers: CustomerItem[];
  isLoading: boolean;
  isError: boolean;
  onRefetch: () => void;
  customerSearch: string;
  onCustomerSearchChange: (value: string) => void;
}

export function PosCustomerDrawer({
  open,
  onOpenChange,
  selectedCustomerId,
  onSelectCustomer,
  customers,
  isLoading,
  isError,
  onRefetch,
  customerSearch,
  onCustomerSearchChange,
}: PosCustomerDrawerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [prevOpen, setPrevOpen] = useState(open);
  const [draftCustomerId, setDraftCustomerId] = useState<number | null>(selectedCustomerId);
  const [customerSegment, setCustomerSegment] = useState<CustomerSegment>("all");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerType, setNewCustomerType] = useState<QuickCustomerType>("registered");

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDraftCustomerId(selectedCustomerId);
      setQuickAddOpen(false);
    }
  }

  const createCustomerMutation = useMutation({
    mutationFn: (payload: {
      code: string;
      name: string;
      phone: string | null;
      customer_type: QuickCustomerType;
    }) =>
      apiFetch<CustomerItem>("/customers", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["pos-customers"] });
      setDraftCustomerId(res.data.id);
      onSelectCustomer(res.data.id);
      setQuickAddOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerType("registered");
      onOpenChange(false);
      toast.success(`Pelanggan ${res.data.name} ditambahkan dan diterapkan.`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal menambahkan pelanggan.");
    },
  });

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customers.filter((c) => {
      if (c.customer_type === "walk_in") return false;
      if (customerSegment !== "all" && c.customer_type !== customerSegment) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, customerSearch, customerSegment]);

  const handleQuickAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCustomerName.trim();
    if (!name || createCustomerMutation.isPending) return;
    const code = `CUST-${Date.now().toString().slice(-6)}`;
    createCustomerMutation.mutate({
      code,
      name,
      phone: newCustomerPhone.trim() || null,
      customer_type: newCustomerType,
    });
  };

  const applySelectedCustomer = () => {
    onSelectCustomer(draftCustomerId);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="md"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]"
      >
        <SheetHeader className="border-b border-eta-border px-5 py-4">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base font-semibold tracking-tight">
              Pilih Pelanggan
            </SheetTitle>
            <Badge variant="soft" color="neutral" size="sm" className="font-mono">
              Customer ID
            </Badge>
          </div>
          <SheetDescription className="text-xs">
            Pilih customer terdaftar atau gunakan walk-in customer.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 border-b border-eta-border p-4">
          <Input
            id="pos-customer-search"
            type="search"
            size="sm"
            value={customerSearch}
            onChange={(e) => onCustomerSearchChange(e.target.value)}
            placeholder="Cari nama, no. HP, ID Member..."
            leftAdornment={<Search className="h-4 w-4" aria-hidden="true" />}
            rightAdornment={<Kbd size="sm">ESC</Kbd>}
            aria-label="Cari pelanggan"
          />

          <SegmentedControl
            type="single"
            variant="segmented"
            size="sm"
            aria-label="Filter tipe pelanggan"
            value={customerSegment}
            onValueChange={(value) => {
              if (typeof value === "string" && value) {
                setCustomerSegment(value as CustomerSegment);
              }
            }}
            className="w-full"
          >
            <SegmentedControlItem value="all" className="flex-1 text-[11px]">
              Semua
            </SegmentedControlItem>
            <SegmentedControlItem value="member" className="flex-1 text-[11px]">
              Member
            </SegmentedControlItem>
            <SegmentedControlItem value="registered" className="flex-1 text-[11px]">
              Reguler
            </SegmentedControlItem>
            <SegmentedControlItem value="wholesale" className="flex-1 text-[11px]">
              Grosir / B2B
            </SegmentedControlItem>
          </SegmentedControl>
        </div>

        <SheetBody className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setQuickAddOpen((prev) => !prev)}
            className="w-full border-dashed"
          >
            {quickAddOpen ? "Tutup Form Tambah Pelanggan" : "Tambah Pelanggan Baru"}
          </Button>

          {quickAddOpen && (
            <form
              onSubmit={handleQuickAddCustomer}
              className="flex flex-col gap-2.5 rounded-lg border border-eta-border bg-eta-subtle/50 p-3"
            >
              <FormField label="Nama Lengkap" isRequired>
                <Input
                  id="quick-cust-name"
                  size="sm"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Nama pelanggan..."
                />
              </FormField>

              <div className="grid grid-cols-2 gap-2">
                <FormField label="No. HP / WA">
                  <Input
                    id="quick-cust-phone"
                    size="sm"
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="08..."
                    className="font-mono"
                  />
                </FormField>
                <FormField label="Tipe">
                  <Select
                    value={newCustomerType}
                    onValueChange={(value) =>
                      setNewCustomerType(value as QuickCustomerType)
                    }
                  >
                    <SelectTrigger id="quick-cust-type" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registered">Reguler</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="wholesale">Grosir / B2B</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <Button
                type="submit"
                variant="solid"
                color="primary"
                size="sm"
                isLoading={createCustomerMutation.isPending}
                disabled={!newCustomerName.trim()}
                className="mt-1 w-full"
              >
                Simpan & Terapkan ke Kasir
              </Button>
            </form>
          )}

          {/* Walk-in Customer Card */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => setDraftCustomerId(null)}
              className={cn(
                "group relative flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                draftCustomerId === null
                  ? "border-eta-primary bg-eta-subtle/70"
                  : "border-eta-border bg-eta-surface hover:bg-eta-hover/40"
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar
                  size="sm"
                  shape="circle"
                  fallback={<UserIcon className="h-4 w-4" aria-hidden="true" />}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-eta-heading">
                      Walk-in Customer
                    </span>
                    {selectedCustomerId === null && (
                      <Badge variant="soft" color="success" size="sm" className="font-mono">
                        Aktif
                      </Badge>
                    )}
                  </div>
                  <span className="mt-0.5 text-[11px] text-eta-muted">
                    Pelanggan umum tanpa keanggotaan
                  </span>
                  <span className="mt-1 font-mono text-[10px] text-eta-muted">
                    Tarif Normal · Tanpa Diskon Member
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                  draftCustomerId === null
                    ? "border-eta-primary bg-eta-primary text-eta-inverse"
                    : "border-eta-border"
                )}
              >
                {draftCustomerId === null && <Check className="h-3 w-3" aria-hidden="true" />}
              </div>
            </button>

            {isLoading ? (
              <div role="status" aria-label="Memuat daftar pelanggan" className="space-y-2 py-2">
                <Skeleton variant="rounded" height={68} />
                <Skeleton variant="rounded" height={68} />
                <Skeleton variant="rounded" height={68} />
              </div>
            ) : isError ? (
              <Alert
                status="error"
                variant="soft"
                title="Gagal memuat data pelanggan"
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={onRefetch}
                  >
                    Coba Lagi
                  </Button>
                }
              />
            ) : filteredCustomers.length === 0 ? (
              <EmptyState
                size="sm"
                variant="bordered"
                title="Tidak ada pelanggan"
                description="Tidak ada pelanggan yang cocok dengan filter."
              />
            ) : (
              filteredCustomers.map((cust) => {
                const isDraftSelected = draftCustomerId === cust.id;
                const isCurrentActive = selectedCustomerId === cust.id;

                return (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => setDraftCustomerId(cust.id)}
                    className={cn(
                      "group relative flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                      isDraftSelected
                        ? "border-eta-primary bg-eta-subtle/70"
                        : "border-eta-border bg-eta-surface hover:bg-eta-hover/40"
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar name={cust.name} size="sm" shape="circle" />
                      <div className="flex min-w-0 flex-col">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-eta-heading">
                            {cust.name}
                          </span>
                          <Badge variant="soft" color="neutral" size="sm" className="font-mono">
                            {getCustomerTypeLabel(cust.customer_type)}
                          </Badge>
                          {isCurrentActive && (
                            <Badge variant="soft" color="success" size="sm" className="font-mono">
                              Aktif
                            </Badge>
                          )}
                        </div>
                        <span className="mt-0.5 font-mono text-[11px] text-eta-muted">
                          {cust.phone ?? cust.code}
                        </span>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-eta-muted">
                          <span>{cust.code}</span>
                          {cust.loyalty_points > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-eta-heading">
                                Poin: {cust.loyalty_points.toLocaleString("id-ID")} pts
                              </span>
                            </>
                          )}
                          {cust.customer_type === "wholesale" &&
                            Number.parseFloat(cust.credit_limit) > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-eta-heading">
                                  Limit: {formatCurrency(cust.credit_limit)}
                                </span>
                              </>
                            )}
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                        isDraftSelected
                          ? "border-eta-primary bg-eta-primary text-eta-inverse"
                          : "border-eta-border group-hover:border-eta-heading/40"
                      )}
                    >
                      {isDraftSelected && <Check className="h-3 w-3" aria-hidden="true" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </SheetBody>

        <SheetFooter className="flex items-center gap-2.5 border-t border-eta-border bg-eta-surface p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="solid"
            color="primary"
            rightIcon={<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={applySelectedCustomer}
            className="flex-1"
          >
            Terapkan Pelanggan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
