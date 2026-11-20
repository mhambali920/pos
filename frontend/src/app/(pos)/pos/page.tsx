"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  LogIn,
  Minus,
  Pause,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  ScanBarcode,
  Search,
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
  User as UserIcon,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { printThermalReceipt } from "@/lib/print-receipt";
import type {
  CategoryItem,
  CustomerItem,
  PaymentMethodItem,
  ProductItem,
  ProductVariantItem,
  ReceiptPayload,
  SaleSummary,
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { usePosCartStore } from "@/stores/pos-cart-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const QUICK_CASH_AMOUNTS = [50_000, 100_000, 200_000] as const;

type CustomerSegment = "all" | "member" | "registered" | "wholesale";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function getCustomerTypeLabel(type: CustomerItem["customer_type"]): string {
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

function PaymentMethodIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "cash":
      return <Banknote className={className} aria-hidden="true" />;
    case "qris":
      return <QrCode className={className} aria-hidden="true" />;
    case "debit":
    case "credit":
      return <CreditCard className={className} aria-hidden="true" />;
    case "transfer":
      return <Landmark className={className} aria-hidden="true" />;
    default:
      return <Wallet className={className} aria-hidden="true" />;
  }
}

export default function PosTerminalPage() {
  const queryClient = useQueryClient();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { token, user, activeStoreId } = useAuthStore();
  const activeStore =
    user?.stores?.find((s) => s.id === activeStoreId) ?? user?.stores?.[0] ?? null;

  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [tenderedInput, setTenderedInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [heldDrawerOpen, setHeldDrawerOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const [receiptPaper, setReceiptPaper] = useState<"58mm" | "80mm">("80mm");
  const [clockText, setClockText] = useState("");
  const [variantImages, setVariantImages] = useState<Record<number, string | null>>({});

  // Customer Selector Sheet state (Stitch Screen 2)
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);
  const [draftCustomerId, setDraftCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSegment, setCustomerSegment] = useState<CustomerSegment>("all");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerType, setNewCustomerType] = useState<"registered" | "member" | "wholesale">(
    "registered"
  );

  const {
    items,
    cartDiscount,
    addItem,
    updateQuantity,
    removeItem,
    setCartDiscount,
    clearCart,
  } = usePosCartStore();

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const updateClock = () => setClockText(formatter.format(new Date()));
    updateClock();
    const id = setInterval(updateClock, 15_000);
    return () => clearInterval(id);
  }, []);

  const isAuthenticated = Boolean(token);

  const categoriesQuery = useQuery({
    queryKey: ["pos-categories"],
    queryFn: () => apiFetch<CategoryItem[]>("/categories"),
    enabled: isAuthenticated,
  });

  const productsQuery = useQuery({
    queryKey: ["pos-products", search, categoryId],
    queryFn: () => {
      const params = new URLSearchParams({ per_page: "60" });
      if (search) params.set("search", search);
      if (categoryId) params.set("category_id", String(categoryId));
      return apiFetch<ProductItem[]>(`/products?${params.toString()}`);
    },
    enabled: isAuthenticated,
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ["pos-payment-methods"],
    queryFn: () => apiFetch<PaymentMethodItem[]>("/payment-methods"),
    enabled: isAuthenticated,
  });

  const customersQuery = useQuery({
    queryKey: ["pos-customers", customerSearch],
    queryFn: () => {
      const params = new URLSearchParams({ per_page: "120" });
      if (customerSearch.trim()) params.set("search", customerSearch.trim());
      return apiFetch<CustomerItem[]>(`/customers?${params.toString()}`);
    },
    enabled: isAuthenticated,
  });

  const heldSalesQuery = useQuery({
    queryKey: ["pos-held-sales"],
    queryFn: () => apiFetch<SaleSummary[]>("/pos/transactions?status=held"),
    enabled: isAuthenticated,
  });

  const createCustomerMutation = useMutation({
    mutationFn: (payload: {
      code: string;
      name: string;
      phone: string | null;
      customer_type: "registered" | "member" | "wholesale";
    }) =>
      apiFetch<CustomerItem>("/customers", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["pos-customers"] });
      setDraftCustomerId(res.data.id);
      setSelectedCustomerId(res.data.id);
      setQuickAddOpen(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerType("registered");
      setCustomerSheetOpen(false);
      toast.success(`Pelanggan ${res.data.name} ditambahkan dan diterapkan.`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Gagal menambahkan pelanggan.");
    },
  });

  const methods = useMemo(
    () => paymentMethodsQuery.data?.data ?? [],
    [paymentMethodsQuery.data?.data]
  );
  const activeMethod = methods.find((m) => m.id === selectedMethodId) ?? methods[0] ?? null;
  const isCashMethod = activeMethod?.type === "cash";

  const customers = useMemo(
    () => customersQuery.data?.data ?? [],
    [customersQuery.data?.data]
  );

  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

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

  const cartQtyByVariant = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of items) {
      map.set(item.productVariantId, item.quantity);
    }
    return map;
  }, [items]);

  const totalItemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotalPreview = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity - item.discountAmount,
        0
      ),
    [items]
  );

  const grandTotalPreview = Math.max(0, subtotalPreview - cartDiscount);
  const tenderedAmount = Number.parseFloat(tenderedInput) || 0;
  const changePreview = Math.max(0, tenderedAmount - grandTotalPreview);
  const isCashInsufficient =
    isCashMethod && tenderedAmount > 0 && tenderedAmount < grandTotalPreview;

  const productTiles = useMemo(
    () =>
      (productsQuery.data?.data ?? []).flatMap((product) =>
        product.variants.map((variant) => ({ product, variant }))
      ),
    [productsQuery.data?.data]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const { product } of productTiles) {
      if (product.category?.id) {
        counts.set(product.category.id, (counts.get(product.category.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [productTiles]);

  const resetPaymentInputs = () => {
    setDiscountInput("");
    setTenderedInput("");
  };

  const handleAddTile = (product: ProductItem, variant: ProductVariantItem) => {
    setVariantImages((prev) =>
      prev[variant.id] === product.image_path
        ? prev
        : { ...prev, [variant.id]: product.image_path }
    );
    addItem({
      productVariantId: variant.id,
      sku: variant.sku,
      name: variant.name || product.name,
      unitPrice: Number.parseFloat(variant.selling_price),
    });
  };

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code || !isAuthenticated) return;

    try {
      const res = await apiFetch<{
        variant: ProductVariantItem;
        product_name: string;
        image_path?: string | null;
      }>(`/products/barcode/${encodeURIComponent(code)}`);
      if (res.data.image_path) {
        setVariantImages((prev) => ({
          ...prev,
          [res.data.variant.id]: res.data.image_path ?? null,
        }));
      }
      addItem({
        productVariantId: res.data.variant.id,
        sku: res.data.variant.sku,
        name: res.data.variant.name || res.data.product_name,
        unitPrice: Number.parseFloat(res.data.variant.selling_price),
      });
      setBarcode("");
      toast.success(`Ditambahkan: ${res.data.variant.sku}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Barcode tidak ditemukan.");
    }
  };

  const handleHold = async () => {
    if (items.length === 0 || processing) return;
    setProcessing(true);
    try {
      await apiFetch("/pos/transactions", {
        method: "POST",
        idempotencyKey: crypto.randomUUID(),
        body: {
          hold: true,
          customer_id: selectedCustomerId,
          cart_discount: cartDiscount,
          items: items.map((i) => ({
            product_variant_id: i.productVariantId,
            quantity: i.quantity,
            discount_amount: i.discountAmount,
          })),
        },
      });
      clearCart();
      resetPaymentInputs();
      setTicketOpen(false);
      toast.success("Pesanan ditahan (Held).");
      void queryClient.invalidateQueries({ queryKey: ["pos-held-sales"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menahan transaksi.");
    } finally {
      setProcessing(false);
    }
  };

  const handleResumeHeld = async (saleId: number) => {
    try {
      await apiFetch(`/pos/transactions/${saleId}/resume`, { method: "POST" });
      toast.success("Pesanan tertahan dilanjutkan.");
      setHeldDrawerOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["pos-held-sales"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal melanjutkan transaksi.");
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0 || !activeMethod || processing) return;
    if (isCashInsufficient) {
      toast.error("Nominal uang tunai kurang dari total tagihan.");
      return;
    }

    setProcessing(true);
    try {
      const createRes = await apiFetch<SaleSummary>("/pos/transactions", {
        method: "POST",
        idempotencyKey: crypto.randomUUID(),
        body: {
          customer_id: selectedCustomerId,
          cart_discount: cartDiscount,
          items: items.map((i) => ({
            product_variant_id: i.productVariantId,
            quantity: i.quantity,
            discount_amount: i.discountAmount,
          })),
        },
      });

      const sale = createRes.data;
      const grandTotal = Number.parseFloat(sale.grand_total);
      const effectiveTendered =
        isCashMethod && tenderedAmount >= grandTotal ? tenderedAmount : grandTotal;

      await apiFetch(`/pos/transactions/${sale.id}/payments`, {
        method: "POST",
        idempotencyKey: crypto.randomUUID(),
        body: {
          payments: [
            {
              payment_method_id: activeMethod.id,
              amount: sale.grand_total,
              tendered_amount: effectiveTendered.toFixed(2),
            },
          ],
        },
      });

      const completeRes = await apiFetch<{ sale: SaleSummary; receipt: ReceiptPayload }>(
        `/pos/transactions/${sale.id}/complete?paper_size=${receiptPaper}`,
        {
          method: "POST",
          idempotencyKey: crypto.randomUUID(),
        }
      );

      setReceipt(completeRes.data.receipt);
      clearCart();
      resetPaymentInputs();
      setTicketOpen(false);
      toast.success(`Transaksi ${sale.transaction_number} selesai.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Pembayaran gagal.");
    } finally {
      setProcessing(false);
    }
  };

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

  const openCustomerSheet = () => {
    setDraftCustomerId(selectedCustomerId);
    setQuickAddOpen(false);
    setCustomerSheetOpen(true);
  };

  const applySelectedCustomer = () => {
    setSelectedCustomerId(draftCustomerId);
    setCustomerSheetOpen(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      barcodeInputRef.current?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setTicketOpen(false);
        searchInputRef.current?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        setTicketOpen(false);
        barcodeInputRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        setHeldDrawerOpen((prev) => !prev);
      } else if (e.key === "F8") {
        e.preventDefault();
        const cashMethod = methods.find((m) => m.type === "cash");
        if (cashMethod) {
          setSelectedMethodId(cashMethod.id);
        }
      } else if (e.key === "Escape") {
        if (!customerSheetOpen && !heldDrawerOpen && !receipt) {
          setSearch("");
          setBarcode("");
          setTicketOpen(false);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAuthenticated, methods, customerSheetOpen, heldDrawerOpen, receipt]);

  const heldSales = heldSalesQuery.data?.data ?? [];
  const heldCount = heldSales.length;
  const categories = categoriesQuery.data?.data ?? [];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/* Top Header Bar — Preserving user's left store/backoffice block + Stitch center scan & right held orders */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-card/90 px-4 py-2 backdrop-blur-md lg:h-16 lg:flex-nowrap lg:py-0">
        {/* PRESERVED LEFT BLOCK */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:flex-none">
          <Button
            variant="outline"
            render={<Link href="/" />}
            nativeButton={false}
            aria-label="Back to backoffice"
            className="h-11 gap-2 px-3 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Backoffice</span>
          </Button>

          <div className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <StoreIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
                {activeStore ? activeStore.name : "POS Register"}
              </h1>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                {activeStore && (
                  <>
                    <span className="font-mono font-medium text-foreground/80">
                      {activeStore.code}
                    </span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span className="truncate">{user?.name ?? "Guest session"}</span>
                {clockText && (
                  <>
                    <span aria-hidden="true">·</span>
                    <time className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {clockText}
                    </time>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Quick Scan Input (Stitch style) */}
        <form
          onSubmit={handleBarcodeScan}
          className="order-last flex w-full items-center lg:order-none lg:mx-auto lg:w-auto lg:max-w-sm lg:flex-1"
        >
          <label htmlFor="pos-barcode" className="sr-only">
            Scan SKU atau Barcode
          </label>
          <div className="relative flex w-full items-center">
            <ScanBarcode
              aria-hidden="true"
              className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
            />
            <input
              id="pos-barcode"
              ref={barcodeInputRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              disabled={!isAuthenticated}
              autoComplete="off"
              placeholder="Scan SKU / Barcode..."
              className="h-9 w-full rounded-md border border-border bg-muted/60 pl-9 pr-11 font-mono text-xs text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <kbd className="pointer-events-none absolute right-2 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              F2
            </kbd>
          </div>
        </form>

        {/* Right: Held Orders Link/Button (Stitch style) */}
        <button
          type="button"
          onClick={() => setHeldDrawerOpen(true)}
          disabled={!isAuthenticated}
          aria-label={`Held Orders, ${heldCount}`}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>Held Orders</span>
          <span
            className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 font-mono text-[10px] font-semibold tabular-nums",
              heldCount > 0
                ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400"
                : "border-border bg-muted text-muted-foreground"
            )}
          >
            {heldCount}
          </span>
        </button>
      </header>

      {/* Main Split Workspace */}
      {!isAuthenticated ? (
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted text-foreground">
              <LogIn className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">Sesi Kasir Diperlukan</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Masuk dengan akun outlet Anda (default:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                admin@pos.local
              </code>
              ) untuk memuat katalog produk, pelanggan, dan metode pembayaran.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                className="h-10 px-5 cursor-pointer"
              >
                Masuk ke Kasir
              </Button>
              <Button
                variant="outline"
                render={<Link href="/" />}
                nativeButton={false}
                className="h-10 px-5 cursor-pointer"
              >
                Kembali ke Dashboard
              </Button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 overflow-hidden">
          {/* LEFT PANE: CATALOGUE & SEARCH (Stitch Neutral Precision) */}
          <section
            aria-label="Katalog Produk"
            className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background lg:border-r lg:border-border"
          >
            {/* Action Toolbar: Search + Category Filter Pills */}
            <div className="flex flex-col gap-3 border-b border-border bg-background/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex min-w-[240px] max-w-xl flex-1 items-center">
                  <label htmlFor="pos-search" className="sr-only">
                    Cari SKU atau Nama Produk
                  </label>
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
                  />
                  <input
                    id="pos-search"
                    ref={searchInputRef}
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari SKU, Nama Produk, atau Scan Barcode EAN-13..."
                    className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-20 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Hapus pencarian"
                      className="absolute right-2 flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <div className="pointer-events-none absolute right-2 hidden items-center gap-1 sm:flex">
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        ⌘K
                      </kbd>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        F1
                      </kbd>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Pill Badges with Live Counts */}
              <div
                role="group"
                aria-label="Filter kategori produk"
                className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
              >
                <button
                  type="button"
                  aria-pressed={categoryId === null}
                  onClick={() => setCategoryId(null)}
                  className={cn(
                    "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    categoryId === null
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span>Semua Produk</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
                      categoryId === null
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {productTiles.length}
                  </span>
                </button>

                {categories.map((cat) => {
                  const isActive = categoryId === cat.id;
                  const count = categoryCounts.get(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span>{cat.name}</span>
                      {count !== undefined && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                            isActive
                              ? "bg-primary-foreground/20 text-primary-foreground font-semibold"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product Catalogue Grid (4 columns on xl) */}
            <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4">
              {productsQuery.isLoading ? (
                <div
                  role="status"
                  aria-label="Memuat produk"
                  className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
                >
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border bg-card p-3"
                    >
                      <div className="mb-2.5 aspect-[4/3] animate-pulse rounded-md bg-muted" />
                      <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
                      <div className="mt-1.5 h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-2">
                        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                        <div className="size-7 animate-pulse rounded-md bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : productsQuery.isError ? (
                <div className="mx-auto mt-10 max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
                  <p className="text-sm font-semibold text-destructive">
                    Gagal memuat katalog produk
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {productsQuery.error instanceof Error
                      ? productsQuery.error.message
                      : "Terjadi kesalahan saat mengambil data produk."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 cursor-pointer"
                    onClick={() => void productsQuery.refetch()}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Coba Lagi
                  </Button>
                </div>
              ) : productTiles.length === 0 ? (
                <div className="mx-auto mt-10 flex max-w-sm flex-col items-center rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
                  <ShoppingBag
                    className="h-8 w-8 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-sm font-semibold">
                    {search || categoryId !== null
                      ? "Produk tidak ditemukan"
                      : "Katalog masih kosong"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {search || categoryId !== null
                      ? "Coba ubah kata kunci pencarian atau pilih kategori lain."
                      : "Tambahkan produk di Backoffice untuk mulai bertransaksi."}
                  </p>
                  {(search || categoryId !== null) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4 cursor-pointer"
                      onClick={() => {
                        setSearch("");
                        setCategoryId(null);
                      }}
                    >
                      Reset Filter
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {productTiles.map(({ product, variant }) => {
                    const inCartQty = cartQtyByVariant.get(variant.id) ?? 0;
                    const label = variant.name || product.name;

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        aria-label={`Tambah ${label}, ${formatCurrency(variant.selling_price)}${
                          inCartQty > 0 ? `, ${inCartQty} di keranjang` : ""
                        }`}
                        onClick={() => handleAddTile(product, variant)}
                        className={cn(
                          "group flex cursor-pointer flex-col justify-between rounded-lg border bg-card/70 p-3 text-left transition-all duration-150 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985]",
                          inCartQty > 0
                            ? "border-primary/70 ring-1 ring-primary/20"
                            : "border-border hover:border-foreground/30"
                        )}
                      >
                        <div className="w-full">
                          <div className="relative mb-2.5 aspect-[4/3] w-full overflow-hidden rounded-md border border-border/60 bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={product.image_path || "/images/products/placeholder.svg"}
                              alt=""
                              width={320}
                              height={240}
                              loading="lazy"
                              onError={(e) => {
                                if (
                                  !e.currentTarget.src.endsWith(
                                    "/images/products/placeholder.svg"
                                  )
                                ) {
                                  e.currentTarget.src = "/images/products/placeholder.svg";
                                }
                              }}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <span className="absolute left-1.5 top-1.5 rounded border border-border/80 bg-background/85 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground backdrop-blur-sm">
                              {variant.sku}
                            </span>
                            {inCartQty > 0 && (
                              <span
                                aria-hidden="true"
                                className="absolute right-1.5 top-1.5 rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white tabular-nums dark:bg-emerald-500 dark:text-neutral-950"
                              >
                                ×{inCartQty}
                              </span>
                            )}
                          </div>

                          <span className="mb-0.5 block truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {product.category?.name ?? "Produk"}
                          </span>
                          <h3 className="line-clamp-1 text-xs font-semibold text-foreground">
                            {label}
                          </h3>
                        </div>

                        <div className="mt-3 flex w-full items-center justify-between border-t border-border/60 pt-2">
                          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                            {formatCurrency(variant.selling_price)}
                          </span>
                          <span
                            aria-hidden="true"
                            className="flex size-7 items-center justify-center rounded-md border border-border bg-muted text-foreground shadow-xs transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                          >
                            <Plus className="h-4 w-4" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT PANE: ACTIVE ORDER TICKET & CHECKOUT PANEL (Stitch Neutral Precision) */}
          <aside
            aria-label="Pesanan Aktif"
            className={cn(
              "w-full flex-col justify-between bg-card/50 lg:static lg:z-auto lg:flex lg:w-[410px] lg:shrink-0 xl:w-[440px]",
              ticketOpen ? "fixed inset-0 z-40 flex bg-card" : "hidden"
            )}
          >
            {/* Ticket Header & Customer Bar */}
            <div className="flex flex-col gap-3 border-b border-border bg-card/80 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">Pesanan Aktif</h2>
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
                    {totalItemCount} Item
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {clockText && (
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      {clockText} WIB
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      clearCart();
                      resetPaymentInputs();
                    }}
                    disabled={items.length === 0}
                    title="Kosongkan Keranjang"
                    aria-label="Kosongkan Keranjang"
                    className="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketOpen(false)}
                    aria-label="Tutup panel pesanan"
                    className="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Customer Card — clicking opens Stitch Screen 2 Customer Selector Sheet */}
              <div className="flex items-center justify-between rounded-md border border-border bg-card p-2 transition-colors hover:border-foreground/25">
                <button
                  type="button"
                  onClick={openCustomerSheet}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left focus-visible:outline-none"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground">
                    {activeCustomer ? (
                      getInitials(activeCustomer.name)
                    ) : (
                      <UserIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-foreground">
                        {activeCustomer ? activeCustomer.name : "Walk-in Customer"}
                      </span>
                      {activeCustomer && (
                        <span className="shrink-0 rounded border border-border bg-muted px-1 py-0.2 font-mono text-[10px] text-muted-foreground">
                          {getCustomerTypeLabel(activeCustomer.customer_type)}
                        </span>
                      )}
                    </div>
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {activeCustomer
                        ? `${activeCustomer.code}${
                            activeCustomer.loyalty_points > 0
                              ? ` · ${activeCustomer.loyalty_points.toLocaleString("id-ID")} pts`
                              : ""
                          }`
                        : "Reguler · Tanpa Diskon Member"}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={openCustomerSheet}
                  title="Ubah Pelanggan"
                  aria-label="Ubah Pelanggan"
                  className="ml-2 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Ticket Items List (Stitch compact rows + hover floating delete) */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
              {items.length === 0 ? (
                <div className="flex h-full min-h-40 flex-col items-center justify-center py-8 text-center">
                  <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                    <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-foreground">
                    Keranjang masih kosong
                  </p>
                  <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-muted-foreground">
                    Scan barcode atau klik produk di sebelah kiri untuk menambahkan ke pesanan.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {items.map((item) => {
                    const lineTotal = item.unitPrice * item.quantity - item.discountAmount;
                    const thumb =
                      variantImages[item.productVariantId] ||
                      "/images/products/placeholder.svg";

                    return (
                      <li
                        key={item.productVariantId}
                        className="group relative flex items-center justify-between gap-3 py-3 first:pt-1"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="size-11 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumb}
                              alt=""
                              width={44}
                              height={44}
                              onError={(e) => {
                                if (
                                  !e.currentTarget.src.endsWith(
                                    "/images/products/placeholder.svg"
                                  )
                                ) {
                                  e.currentTarget.src = "/images/products/placeholder.svg";
                                }
                              }}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="mb-0.5 block truncate text-xs font-medium text-foreground">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                              <span>{formatCurrency(item.unitPrice)}</span>
                              <span>×</span>
                              <span className="font-medium text-foreground">{item.quantity}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center rounded border border-border bg-background p-0.5">
                            <button
                              type="button"
                              aria-label={`Kurangi jumlah ${item.name}`}
                              onClick={() =>
                                updateQuantity(item.productVariantId, item.quantity - 1)
                              }
                              className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <Minus className="h-3 w-3" aria-hidden="true" />
                            </button>
                            <span
                              aria-label={`Jumlah ${item.quantity}`}
                              className="w-6 text-center font-mono text-xs font-medium text-foreground tabular-nums"
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Tambah jumlah ${item.name}`}
                              onClick={() =>
                                updateQuantity(item.productVariantId, item.quantity + 1)
                              }
                              className="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <Plus className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>

                          <div className="relative flex min-w-[76px] items-center justify-end">
                            <span className="text-right font-mono text-xs font-semibold tabular-nums text-foreground transition-opacity group-hover:opacity-20">
                              {formatCurrency(lineTotal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(item.productVariantId)}
                              title="Hapus Item"
                              aria-label={`Hapus ${item.name}`}
                              className="pointer-events-none absolute right-0 top-1/2 z-10 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border border-border bg-card/90 p-1.5 text-muted-foreground opacity-0 shadow-sm backdrop-blur-md transition-opacity hover:border-destructive/40 hover:bg-destructive/15 hover:text-destructive focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Billing Breakdown & Payment Methods (Stitch style) */}
            <div className="flex flex-col gap-3 border-t border-border bg-card p-4">
              {/* Summary Card */}
              <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotal ({totalItemCount} Item)</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatCurrency(subtotalPreview)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <label htmlFor="pos-discount">Diskon Keranjang</label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-2 font-mono text-[10px] text-muted-foreground">
                      Rp
                    </span>
                    <input
                      id="pos-discount"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="0"
                      value={discountInput}
                      onChange={(e) => {
                        setDiscountInput(e.target.value);
                        setCartDiscount(Number.parseFloat(e.target.value) || 0);
                      }}
                      className="h-7 w-28 rounded border border-border bg-background pl-7 pr-2 text-right font-mono text-xs tabular-nums text-foreground focus-visible:border-ring focus-visible:outline-none"
                    />
                  </div>
                </div>
                <div className="my-1 h-px bg-border" />
                <div className="flex items-baseline justify-between pt-0.5">
                  <div>
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Total Tagihan
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      {totalItemCount} Barang Terdaftar
                    </span>
                  </div>
                  <span className="font-mono text-2xl font-bold tracking-tight tabular-nums text-foreground">
                    {formatCurrency(grandTotalPreview)}
                  </span>
                </div>
              </div>

              {/* Payment Methods Selector (4-col shadcn cards) */}
              <div>
                <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                  Pilih Metode Pembayaran
                </span>
                {paymentMethodsQuery.isLoading ? (
                  <p role="status" className="text-xs text-muted-foreground">
                    Memuat metode pembayaran...
                  </p>
                ) : paymentMethodsQuery.isError ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-destructive">Gagal memuat metode pembayaran.</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => void paymentMethodsQuery.refetch()}
                      className="cursor-pointer"
                    >
                      Coba Lagi
                    </Button>
                  </div>
                ) : methods.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Belum ada metode pembayaran aktif.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {methods.slice(0, 8).map((m) => {
                      const selected = activeMethod?.id === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedMethodId(m.id)}
                          className={cn(
                            "flex cursor-pointer flex-col items-center justify-center rounded-md px-1 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            selected
                              ? "bg-primary font-medium text-primary-foreground shadow-xs"
                              : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <PaymentMethodIcon
                            type={m.type}
                            className={cn(
                              "mb-0.5 h-4 w-4",
                              selected ? "text-primary-foreground" : "text-muted-foreground"
                            )}
                          />
                          <span className="max-w-full truncate text-[11px] font-medium">
                            {m.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Cash Inputs & Tender Calculation */}
              {isCashMethod && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="pos-tendered" className="text-muted-foreground">
                      Nominal Diterima
                    </label>
                    {tenderedAmount > 0 && (
                      <span
                        role="status"
                        className={cn(
                          "font-mono text-[11px] font-medium tabular-nums",
                          isCashInsufficient
                            ? "text-destructive"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {isCashInsufficient
                          ? `Kurang: ${formatCurrency(grandTotalPreview - tenderedAmount)}`
                          : `Kembalian: ${formatCurrency(changePreview)}`}
                      </span>
                    )}
                  </div>

                  <div className="mb-0.5 grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTenderedInput(String(grandTotalPreview))}
                      className={cn(
                        "cursor-pointer rounded border py-1 text-center font-mono text-[11px] transition-colors",
                        tenderedAmount > 0 && tenderedAmount === grandTotalPreview
                          ? "border-foreground/40 bg-muted font-semibold text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      Uang Pas
                    </button>
                    {QUICK_CASH_AMOUNTS.map((amount) => {
                      const activeChip = tenderedAmount === amount;
                      return (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setTenderedInput(String(amount))}
                          className={cn(
                            "cursor-pointer rounded border py-1 text-center font-mono text-[11px] tabular-nums transition-colors",
                            activeChip
                              ? "border-foreground/40 bg-muted font-semibold text-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {amount.toLocaleString("id-ID")}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-3 font-mono text-xs font-semibold text-muted-foreground">
                      Rp
                    </span>
                    <input
                      id="pos-tendered"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="0"
                      value={tenderedInput}
                      onChange={(e) => setTenderedInput(e.target.value)}
                      className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-9 font-mono text-sm font-semibold tabular-nums text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    />
                    {tenderedAmount > 0 && !isCashInsufficient && (
                      <CheckCircle2
                        aria-hidden="true"
                        className="pointer-events-none absolute right-2.5 h-4 w-4 text-emerald-600 dark:text-emerald-400"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Primary Checkout Button Actions (Stitch style) */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleHold}
                  disabled={items.length === 0 || processing}
                  title="Tahan Pesanan (F4)"
                  aria-label="Tahan Pesanan"
                  className="flex h-10 w-12 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Pause className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={
                    items.length === 0 ||
                    processing ||
                    isCashInsufficient ||
                    !activeMethod
                  }
                  className="inline-flex h-10 flex-[2] cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold tracking-wide text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>
                    {processing
                      ? "MEMPROSES..."
                      : `BAYAR SEKARANG · ${formatCurrency(grandTotalPreview)}`}
                  </span>
                  {!processing && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </aside>

          {/* Mobile Sticky Checkout Bar */}
          <div className="fixed inset-x-0 bottom-7 z-30 border-t border-border bg-card p-3 lg:hidden">
            <button
              type="button"
              onClick={() => setTicketOpen(true)}
              className="flex h-11 w-full cursor-pointer items-center justify-between rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <span>
                PESANAN AKTIF ({totalItemCount} ITEM)
              </span>
              <span className="font-mono text-sm tabular-nums">
                {formatCurrency(grandTotalPreview)}
              </span>
            </button>
          </div>
        </main>
      )}

      {/* Fixed Bottom Status & Keyboard Shortcut Bar (Stitch style) */}
      <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-card px-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex size-2 rounded-full bg-emerald-500"
          />
          <span className="hidden md:inline">
            Enterprise POS · {activeStore?.code ?? "Register"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.2 font-mono text-[9px] text-foreground">
              F1
            </kbd>
            <span>Cari</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.2 font-mono text-[9px] text-foreground">
              F2
            </kbd>
            <span>Scan</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.2 font-mono text-[9px] text-foreground">
              F4
            </kbd>
            <span>Tahan</span>
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.2 font-mono text-[9px] text-foreground">
              F8
            </kbd>
            <span>Tunai</span>
          </div>
        </div>
      </footer>

      {/* SCREEN 2: CUSTOMER SELECTOR SHEET (Stitch Right Slide-over Sheet) */}
      <Sheet open={customerSheetOpen} onOpenChange={setCustomerSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]"
        >
          <SheetHeader className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base font-semibold tracking-tight">
                Pilih Pelanggan
              </SheetTitle>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                Customer ID
              </span>
            </div>
            <SheetDescription className="text-xs">
              Pilih customer terdaftar atau gunakan walk-in customer.
            </SheetDescription>
          </SheetHeader>

          {/* Search & Segment Filter Tabs */}
          <div className="flex flex-col gap-3 border-b border-border/80 p-4">
            <div className="relative flex items-center">
              <label htmlFor="pos-customer-search" className="sr-only">
                Cari pelanggan
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
              />
              <input
                id="pos-customer-search"
                type="search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Cari nama, no. HP, ID Member..."
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-14 text-xs text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
              />
              <kbd className="pointer-events-none absolute right-2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ESC
              </kbd>
            </div>

            <div
              role="group"
              aria-label="Filter tipe pelanggan"
              className="flex items-center gap-1.5 overflow-x-auto"
            >
              {(
                [
                  { id: "all", label: "Semua" },
                  { id: "member", label: "Member" },
                  { id: "registered", label: "Reguler" },
                  { id: "wholesale", label: "Grosir / B2B" },
                ] as const
              ).map((tab) => {
                const active = customerSegment === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCustomerSegment(tab.id)}
                    className={cn(
                      "cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer List + Quick Add Toggle */}
          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
            <button
              type="button"
              onClick={() => setQuickAddOpen((prev) => !prev)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-muted/50 hover:text-foreground"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>{quickAddOpen ? "Tutup Form Tambah Pelanggan" : "+ Tambah Pelanggan Baru"}</span>
            </button>

            {quickAddOpen && (
              <form
                onSubmit={handleQuickAddCustomer}
                className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 p-3"
              >
                <div>
                  <label
                    htmlFor="quick-cust-name"
                    className="mb-1 block text-[11px] font-medium text-muted-foreground"
                  >
                    Nama Lengkap
                  </label>
                  <input
                    id="quick-cust-name"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Nama pelanggan..."
                    className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus-visible:border-ring focus-visible:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="quick-cust-phone"
                      className="mb-1 block text-[11px] font-medium text-muted-foreground"
                    >
                      No. HP / WA
                    </label>
                    <input
                      id="quick-cust-phone"
                      type="tel"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="08..."
                      className="h-9 w-full rounded-md border border-border bg-background px-2.5 font-mono text-xs text-foreground focus-visible:border-ring focus-visible:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="quick-cust-type"
                      className="mb-1 block text-[11px] font-medium text-muted-foreground"
                    >
                      Tipe
                    </label>
                    <select
                      id="quick-cust-type"
                      value={newCustomerType}
                      onChange={(e) =>
                        setNewCustomerType(
                          e.target.value as "registered" | "member" | "wholesale"
                        )
                      }
                      className="h-9 w-full cursor-pointer rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:border-ring focus-visible:outline-none"
                    >
                      <option value="registered">Reguler</option>
                      <option value="member">Member</option>
                      <option value="wholesale">Grosir / B2B</option>
                    </select>
                  </div>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newCustomerName.trim() || createCustomerMutation.isPending}
                  className="mt-1 w-full cursor-pointer text-xs"
                >
                  {createCustomerMutation.isPending
                    ? "Menyimpan..."
                    : "Simpan & Terapkan ke Kasir"}
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
                    ? "border-foreground/40 bg-muted/60"
                    : "border-border bg-card/60 hover:border-foreground/25 hover:bg-card"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                    <UserIcon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        Walk-in Customer
                      </span>
                      {selectedCustomerId === null && (
                        <span className="rounded border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.2 font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                          Aktif Saat Ini
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">
                      Pelanggan umum tanpa keanggotaan
                    </span>
                    <span className="mt-1 font-mono text-[10px] text-muted-foreground">
                      Tarif Normal · Tanpa Diskon Member
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                    draftCustomerId === null
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {draftCustomerId === null && <Check className="h-3 w-3" aria-hidden="true" />}
                </div>
              </button>

              {/* Registered / Member / Wholesale Customers */}
              {customersQuery.isLoading ? (
                <p role="status" className="py-8 text-center text-xs text-muted-foreground">
                  Memuat daftar pelanggan...
                </p>
              ) : customersQuery.isError ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-destructive">Gagal memuat data pelanggan.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className="mt-2 cursor-pointer"
                    onClick={() => void customersQuery.refetch()}
                  >
                    Coba Lagi
                  </Button>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Tidak ada pelanggan yang cocok dengan filter.
                </p>
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
                          ? "border-foreground/40 bg-muted/60"
                          : "border-border bg-card/60 hover:border-foreground/25 hover:bg-card"
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground">
                          {getInitials(cust.name)}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-xs font-semibold text-foreground">
                              {cust.name}
                            </span>
                            <span className="rounded border border-border bg-muted px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
                              {getCustomerTypeLabel(cust.customer_type)}
                            </span>
                            {isCurrentActive && (
                              <span className="rounded border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.2 font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                                Aktif
                              </span>
                            )}
                          </div>
                          <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {cust.phone ?? cust.code}
                          </span>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                            <span>{cust.code}</span>
                            {cust.loyalty_points > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-foreground/80">
                                  Poin: {cust.loyalty_points.toLocaleString("id-ID")} pts
                                </span>
                              </>
                            )}
                            {cust.customer_type === "wholesale" &&
                              Number.parseFloat(cust.credit_limit) > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-foreground/80">
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
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border group-hover:border-foreground/40"
                        )}
                      >
                        {isDraftSelected && <Check className="h-3 w-3" aria-hidden="true" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Sticky Sheet Footer */}
          <div className="flex items-center gap-2.5 border-t border-border bg-card p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomerSheetOpen(false)}
              className="h-9 flex-1 cursor-pointer text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={applySelectedCustomer}
              className="h-9 flex-1 cursor-pointer gap-1.5 text-xs font-semibold"
            >
              <span>Terapkan Pelanggan</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Held Orders Sheet */}
      <Sheet open={heldDrawerOpen} onOpenChange={setHeldDrawerOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-base font-semibold">
              Held Orders ({heldCount})
            </SheetTitle>
            <SheetDescription className="text-xs">
              Pesanan tertahan di outlet ini yang siap dilanjutkan.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5">
            {heldSalesQuery.isLoading ? (
              <p role="status" className="py-12 text-center text-xs text-muted-foreground">
                Memuat pesanan tertahan...
              </p>
            ) : heldSalesQuery.isError ? (
              <div className="py-12 text-center">
                <p className="text-xs text-destructive">Gagal memuat pesanan tertahan.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 cursor-pointer"
                  onClick={() => void heldSalesQuery.refetch()}
                >
                  Coba Lagi
                </Button>
              </div>
            ) : heldSales.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold">Tidak ada pesanan tertahan</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gunakan tombol Tahan (F4) untuk menyimpan sementara pesanan aktif.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {heldSales.map((sale) => (
                  <li
                    key={sale.id}
                    className="flex items-center justify-between gap-3 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold">
                        {sale.transaction_number}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">
                        {formatCurrency(sale.grand_total)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => handleResumeHeld(sale.id)}
                    >
                      Lanjutkan
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Thermal Receipt Dialog */}
      <Dialog
        open={receipt !== null}
        onOpenChange={(open) => {
          if (!open) setReceipt(null);
        }}
      >
        <DialogContent className="gap-4 p-5 sm:max-w-md">
          {receipt && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">
                  Struk Transaksi
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {receipt.transaction_number}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-baseline justify-between rounded-md border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-emerald-700 dark:text-emerald-400">
                <span className="text-xs font-semibold">Lunas · Kembalian</span>
                <span className="font-mono text-xl font-bold tabular-nums">
                  {formatCurrency(receipt.change_amount)}
                </span>
              </div>

              <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/40 px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                {receipt.thermal_text}
              </pre>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div
                  role="group"
                  aria-label="Ukuran kertas struk"
                  className="flex items-center gap-1.5"
                >
                  {(["58mm", "80mm"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={receiptPaper === size}
                      onClick={() => setReceiptPaper(size)}
                      className={cn(
                        "cursor-pointer rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors",
                        receiptPaper === size
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() =>
                      printThermalReceipt(
                        receipt.thermal_text,
                        receiptPaper,
                        receipt.transaction_number
                      )
                    }
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    Cetak
                  </Button>
                  <Button
                    type="button"
                    className="cursor-pointer"
                    onClick={() => setReceipt(null)}
                  >
                    Transaksi Baru
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
