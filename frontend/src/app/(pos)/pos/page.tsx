"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Barcode,
  Clock,
  LogIn,
  Minus,
  PauseCircle,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
  User as UserIcon,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const QUICK_CASH_AMOUNTS = [20_000, 50_000, 100_000, 200_000] as const;

export default function PosTerminalPage() {
  const queryClient = useQueryClient();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const { token, user, activeStoreId } = useAuthStore();
  const activeStore = user?.stores?.find((s) => s.id === activeStoreId) ?? user?.stores?.[0] ?? null;

  const [barcode, setBarcode] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [tenderedInput, setTenderedInput] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [heldDrawerOpen, setHeldDrawerOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptPayload | null>(null);
  const [receiptPaper, setReceiptPaper] = useState<"58mm" | "80mm">("80mm");
  const [clockText, setClockText] = useState("");

  const { items, cartDiscount, addItem, updateQuantity, removeItem, setCartDiscount, clearCart } =
    usePosCartStore();

  useEffect(() => {
    const updateClock = () => {
      setClockText(
        new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date())
      );
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
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
    queryKey: ["pos-customers"],
    queryFn: () => apiFetch<CustomerItem[]>("/customers?per_page=50"),
    enabled: isAuthenticated,
  });

  const heldSalesQuery = useQuery({
    queryKey: ["pos-held-sales"],
    queryFn: () => apiFetch<SaleSummary[]>("/pos/transactions?status=held"),
    enabled: isAuthenticated,
  });

  const methods = paymentMethodsQuery.data?.data ?? [];
  const activeMethod = methods.find((m) => m.id === selectedMethodId) ?? methods[0] ?? null;
  const isCashMethod = activeMethod?.type === "cash";

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
  const isCashInsufficient = isCashMethod && tenderedAmount > 0 && tenderedAmount < grandTotalPreview;

  const productTiles = useMemo(
    () =>
      (productsQuery.data?.data ?? []).flatMap((product) =>
        product.variants.map((variant) => ({ product, variant }))
      ),
    [productsQuery.data?.data]
  );

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code || !isAuthenticated) return;

    try {
      const res = await apiFetch<{ variant: ProductVariantItem; product_name: string }>(
        `/products/barcode/${encodeURIComponent(code)}`
      );
      addItem({
        productVariantId: res.data.variant.id,
        sku: res.data.variant.sku,
        name: res.data.variant.name || res.data.product_name,
        unitPrice: Number.parseFloat(res.data.variant.selling_price),
      });
      setBarcode("");
      toast.success(`Added ${res.data.variant.sku}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Barcode not found.");
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
      setDiscountInput("");
      setTenderedInput("");
      toast.success("Order placed on hold.");
      void queryClient.invalidateQueries({ queryKey: ["pos-held-sales"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to hold transaction.");
    } finally {
      setProcessing(false);
    }
  };

  const handleResumeHeld = async (saleId: number) => {
    try {
      await apiFetch(`/pos/transactions/${saleId}/resume`, { method: "POST" });
      toast.success("Held transaction resumed.");
      setHeldDrawerOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["pos-held-sales"] });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to resume transaction.");
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0 || !activeMethod || processing) return;
    if (isCashInsufficient) {
      toast.error("Cash tendered is less than the estimated total.");
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
      setDiscountInput("");
      setTenderedInput("");
      toast.success(`Sale ${sale.transaction_number} completed.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Checkout failed.");
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      barcodeInputRef.current?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        setHeldDrawerOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setSearch("");
        setBarcode("");
        setHeldDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAuthenticated]);

  const heldCount = heldSalesQuery.data?.data?.length ?? 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F4F4F0] text-[#14171F] dark:bg-[#0C0D10] dark:text-[#F4F5F7]">
      {/* Top Register Header */}
      <header className="flex h-15 shrink-0 items-center justify-between gap-4 border-b border-[#E4E4DF] bg-white px-4 dark:border-[#242730] dark:bg-[#14161B]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E4E4DF] bg-[#F8F8F5] px-3 text-xs font-medium text-[#14171F] transition hover:bg-[#ECECE6] dark:border-[#262932] dark:bg-[#1B1E25] dark:text-[#F4F5F7] dark:hover:bg-[#242833]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Backoffice</span>
          </Link>

          <div className="hidden h-5 w-px bg-[#E4E4DF] sm:block dark:bg-[#262932]" />

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F766E] text-white">
              <StoreIcon className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">
                {activeStore ? `${activeStore.code} · ${activeStore.name}` : "POS Register"}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#646975] dark:text-[#9499A6]">
                <span>{user?.name ?? "Guest Session"}</span>
                {clockText && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="h-3 w-3" />
                      {clockText}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Barcode Scanner Bar */}
        <form
          onSubmit={handleBarcodeScan}
          className="flex flex-1 max-w-md items-center gap-2"
        >
          <div className="relative flex-1">
            <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#646975]" />
            <input
              ref={barcodeInputRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              disabled={!isAuthenticated}
              placeholder="Scan barcode & press Enter..."
              className="h-9 w-full rounded-lg border border-[#D8D8D1] bg-[#FAFAF8] pl-9 pr-12 text-sm text-[#14171F] placeholder:text-[#7A7F8A] focus:border-[#0F766E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 disabled:opacity-50 dark:border-[#2A2E39] dark:bg-[#0F1116] dark:text-[#F4F5F7] dark:focus:border-[#10B981]"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[#D8D8D1] bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#646975] dark:border-[#2E323D] dark:bg-[#1B1E25]">
              F2
            </kbd>
          </div>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!isAuthenticated || !barcode.trim()}
            className="h-9"
          >
            Scan
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHeldDrawerOpen(true)}
            disabled={!isAuthenticated}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4E4DF] bg-white px-3 text-xs font-medium transition hover:bg-[#F4F4F0] disabled:opacity-50 cursor-pointer dark:border-[#262932] dark:bg-[#1B1E25] dark:hover:bg-[#242833]"
          >
            <PauseCircle className="h-4 w-4 text-amber-600" />
            <span className="hidden md:inline">Held Orders</span>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[#F4F4F0] px-1.5 font-mono text-[11px] font-semibold tabular-nums dark:bg-[#262932]">
              {heldCount}
            </span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      {!isAuthenticated ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-[#E4E4DF] bg-white p-8 text-center shadow-sm dark:border-[#242730] dark:bg-[#14161B]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F766E]/10 text-[#0F766E]">
              <LogIn className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Cashier Session Required</h1>
            <p className="mt-2 text-sm text-[#646975] dark:text-[#9499A6]">
              Sign in with your outlet account (default: <code className="font-mono">admin@pos.local</code>) to load the catalog, stock levels, and payment methods.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/login">
                <Button className="bg-[#0F766E] text-white hover:bg-[#0D655E]">
                  Sign In to Register
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Pane: Search, Categories & Product Grid */}
          <section className="flex flex-1 flex-col min-w-0 overflow-hidden p-4 lg:p-5">
            {/* Search & Category Bar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#646975]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products by name, SKU, or barcode..."
                  className="h-10 w-full rounded-lg border border-[#D8D8D1] bg-white pl-9 pr-8 text-sm text-[#14171F] placeholder:text-[#7A7F8A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/15 dark:border-[#262932] dark:bg-[#14161B] dark:text-[#F4F5F7]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#646975] hover:text-[#14171F] cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="text-xs font-medium text-[#646975] tabular-nums dark:text-[#9499A6]">
                {productTiles.length} items available
              </div>
            </div>

            {/* Category Tabs */}
            <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className={cn(
                  "shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer",
                  categoryId === null
                    ? "bg-[#14171F] text-white dark:bg-[#F4F5F7] dark:text-[#14171F]"
                    : "border border-[#E4E4DF] bg-white text-[#4A4F5A] hover:bg-[#ECECE6] dark:border-[#262932] dark:bg-[#14161B] dark:text-[#A1A6B2]"
                )}
              >
                All Products
              </button>
              {(categoriesQuery.data?.data ?? []).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(
                    "shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer",
                    categoryId === cat.id
                      ? "bg-[#14171F] text-white dark:bg-[#F4F5F7] dark:text-[#14171F]"
                      : "border border-[#E4E4DF] bg-white text-[#4A4F5A] hover:bg-[#ECECE6] dark:border-[#262932] dark:bg-[#14161B] dark:text-[#A1A6B2]"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {productsQuery.isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-56 animate-pulse rounded-xl border border-[#E4E4DF] bg-white p-3 dark:border-[#242730] dark:bg-[#14161B]"
                    >
                      <div className="h-28 rounded-lg bg-[#ECECE6] dark:bg-[#22252F]" />
                      <div className="mt-3 h-3 w-16 rounded bg-[#ECECE6] dark:bg-[#22252F]" />
                      <div className="mt-2 h-4 w-3/4 rounded bg-[#ECECE6] dark:bg-[#22252F]" />
                      <div className="mt-4 h-4 w-24 rounded bg-[#ECECE6] dark:bg-[#22252F]" />
                    </div>
                  ))}
                </div>
              ) : productsQuery.isError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    {productsQuery.error instanceof Error
                      ? productsQuery.error.message
                      : "Failed to load catalog."}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => void productsQuery.refetch()}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Retry
                  </Button>
                </div>
              ) : productTiles.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#D8D8D1] bg-white/60 text-center dark:border-[#2A2E39] dark:bg-[#14161B]/60">
                  <ShoppingBag className="h-8 w-8 text-[#9499A6]" />
                  <p className="mt-2 text-sm font-medium">No matching products</p>
                  <p className="text-xs text-[#646975]">
                    Try clearing your search or switching category.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {productTiles.map(({ product, variant }) => {
                    const inCartQty = cartQtyByVariant.get(variant.id) ?? 0;

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() =>
                          addItem({
                            productVariantId: variant.id,
                            sku: variant.sku,
                            name: variant.name || product.name,
                            unitPrice: Number.parseFloat(variant.selling_price),
                          })
                        }
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-xl border bg-white text-left transition active:scale-[0.985] cursor-pointer dark:bg-[#14161B]",
                          inCartQty > 0
                            ? "border-[#0F766E] ring-1 ring-[#0F766E]/30"
                            : "border-[#E4E4DF] hover:border-[#B8B8AF] dark:border-[#242730] dark:hover:border-[#3A3F4D]"
                        )}
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4F4F0] dark:bg-[#1B1E25]">
                          <img
                            src={product.image_path || "/images/products/placeholder.svg"}
                            alt={variant.name || product.name}
                            onError={(e) => {
                              if (!e.currentTarget.src.endsWith("/images/products/placeholder.svg")) {
                                e.currentTarget.src = "/images/products/placeholder.svg";
                              }
                            }}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                          />

                          {inCartQty > 0 && (
                            <span className="absolute right-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[#0F766E] px-1.5 font-mono text-xs font-bold text-white shadow-sm tabular-nums">
                              {inCartQty}×
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col justify-between p-3">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[11px] text-[#646975] dark:text-[#9499A6]">
                                {variant.sku}
                              </span>
                              {product.category && (
                                <span className="truncate text-[10px] font-medium text-[#7A7F8A]">
                                  {product.category.name}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm font-semibold leading-snug line-clamp-2">
                              {variant.name || product.name}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-[#F0F0EB] pt-2 dark:border-[#22252F]">
                            <span className="text-sm font-bold tabular-nums text-[#0F766E] dark:text-[#34D399]">
                              {formatCurrency(variant.selling_price)}
                            </span>
                            <span className="text-[11px] font-medium text-[#646975] group-hover:text-[#14171F] dark:group-hover:text-white">
                              + Add
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Right Pane: Order Ticket & Checkout */}
          <aside className="flex w-[390px] shrink-0 flex-col border-l border-[#E4E4DF] bg-white xl:w-[430px] dark:border-[#242730] dark:bg-[#14161B]">
            {/* Ticket Header + Customer Selector */}
            <div className="space-y-3 border-b border-[#E4E4DF] p-4 dark:border-[#242730]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-tight">Current Ticket</h2>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[#0F766E]/10 px-1.5 font-mono text-xs font-bold text-[#0F766E] tabular-nums dark:text-[#34D399]">
                    {totalItemCount}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    setDiscountInput("");
                    setTenderedInput("");
                  }}
                  disabled={items.length === 0}
                  className="text-xs font-medium text-[#646975] hover:text-red-600 disabled:opacity-40 cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="relative flex items-center">
                <UserIcon className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-[#646975]" />
                <select
                  aria-label="Select customer"
                  value={selectedCustomerId ?? ""}
                  onChange={(e) =>
                    setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="h-9 w-full rounded-lg border border-[#E4E4DF] bg-[#FAFAF8] pl-8 pr-3 text-xs font-medium text-[#14171F] focus:border-[#0F766E] focus:outline-none dark:border-[#262932] dark:bg-[#1B1E25] dark:text-[#F4F5F7]"
                >
                  <option value="">Walk-in Customer</option>
                  {(customersQuery.data?.data ?? []).map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} ({cust.customer_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cart Line Items */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4F4F0] text-[#7A7F8A] dark:bg-[#1B1E25]">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-sm font-medium">Ticket is empty</p>
                  <p className="mt-1 max-w-[220px] text-xs text-[#646975]">
                    Scan a barcode or tap any product tile on the left to begin checkout.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#F0F0EB] dark:divide-[#22252F]">
                  {items.map((item) => {
                    const lineTotal = item.unitPrice * item.quantity - item.discountAmount;
                    return (
                      <div key={item.productVariantId} className="py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium leading-tight">
                              {item.name}
                            </div>
                            <div className="mt-0.5 font-mono text-[11px] text-[#646975] tabular-nums">
                              {formatCurrency(item.unitPrice)} / unit
                            </div>
                          </div>
                          <div className="text-right font-mono text-sm font-semibold tabular-nums">
                            {formatCurrency(lineTotal)}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-lg border border-[#E4E4DF] bg-[#FAFAF8] dark:border-[#262932] dark:bg-[#1B1E25]">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() =>
                                updateQuantity(item.productVariantId, item.quantity - 1)
                              }
                              className="flex h-7 w-7 items-center justify-center text-[#4A4F5A] hover:text-[#14171F] cursor-pointer dark:text-[#A1A6B2]"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center font-mono text-xs font-bold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() =>
                                updateQuantity(item.productVariantId, item.quantity + 1)
                              }
                              className="flex h-7 w-7 items-center justify-center text-[#4A4F5A] hover:text-[#14171F] cursor-pointer dark:text-[#A1A6B2]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() => removeItem(item.productVariantId)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#7A7F8A] hover:bg-red-50 hover:text-red-600 cursor-pointer dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Totals, Payment Method & Actions */}
            <div className="space-y-3 border-t border-[#E4E4DF] bg-[#FAFAF8] p-4 dark:border-[#242730] dark:bg-[#111318]">
              {/* Cart Discount + Summary */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#646975]">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatCurrency(subtotalPreview)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[#646975]">
                  <span>Cart Discount</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={discountInput}
                    onChange={(e) => {
                      setDiscountInput(e.target.value);
                      setCartDiscount(Number.parseFloat(e.target.value) || 0);
                    }}
                    className="h-7 w-28 rounded-md border border-[#D8D8D1] bg-white px-2 text-right font-mono text-xs tabular-nums focus:border-[#0F766E] focus:outline-none dark:border-[#262932] dark:bg-[#181B22]"
                  />
                </div>
                <div className="flex items-baseline justify-between border-t border-[#E4E4DF] pt-2 dark:border-[#242730]">
                  <span className="text-sm font-semibold">Total (Pre-Tax)</span>
                  <span className="font-mono text-xl font-bold tracking-tight tabular-nums">
                    {formatCurrency(grandTotalPreview)}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#646975]">
                  Payment Method
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {methods.map((m) => {
                    const selected = activeMethod?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethodId(m.id)}
                        className={cn(
                          "h-8 rounded-lg border px-2 text-xs font-semibold transition cursor-pointer",
                          selected
                            ? "border-[#14171F] bg-[#14171F] text-white dark:border-[#F4F5F7] dark:bg-[#F4F5F7] dark:text-[#14171F]"
                            : "border-[#D8D8D1] bg-white text-[#4A4F5A] hover:bg-[#F4F4F0] dark:border-[#262932] dark:bg-[#181B22] dark:text-[#A1A6B2]"
                        )}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Input & Quick Denominations */}
              {isCashMethod && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Cash received (Rp)..."
                      value={tenderedInput}
                      onChange={(e) => setTenderedInput(e.target.value)}
                      className="h-9 font-mono tabular-nums"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0"
                      onClick={() => setTenderedInput(String(grandTotalPreview))}
                    >
                      Exact
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {QUICK_CASH_AMOUNTS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setTenderedInput(String(amount))}
                        className="h-7 rounded-md border border-[#E4E4DF] bg-white font-mono text-[11px] font-medium tabular-nums text-[#4A4F5A] hover:border-[#0F766E] hover:text-[#0F766E] cursor-pointer dark:border-[#262932] dark:bg-[#181B22] dark:text-[#A1A6B2]"
                      >
                        {amount / 1000}k
                      </button>
                    ))}
                  </div>

                  {tenderedAmount > 0 && (
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold tabular-nums",
                        isCashInsufficient
                          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          : "bg-[#0F766E]/10 text-[#0F766E] dark:text-[#34D399]"
                      )}
                    >
                      <span>{isCashInsufficient ? "Insufficient Cash" : "Change Due"}</span>
                      <span className="font-mono text-sm">
                        {isCashInsufficient
                          ? `-${formatCurrency(grandTotalPreview - tenderedAmount)}`
                          : formatCurrency(changePreview)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Primary Checkout CTA Row */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleHold}
                  disabled={items.length === 0 || processing}
                  className="h-11"
                >
                  Hold
                </Button>
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={items.length === 0 || processing || isCashInsufficient || !activeMethod}
                  className="col-span-2 inline-flex h-11 items-center justify-center rounded-lg bg-[#0F766E] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0D655E] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                >
                  {processing
                    ? "Processing Checkout..."
                    : `Pay ${formatCurrency(grandTotalPreview)}`}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Held Transactions Slide-over Drawer */}
      {heldDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-[#14161B]">
            <div className="flex items-center justify-between border-b border-[#E4E4DF] px-5 py-4 dark:border-[#242730]">
              <h3 className="text-sm font-semibold">Held Orders ({heldCount})</h3>
              <button
                type="button"
                onClick={() => setHeldDrawerOpen(false)}
                className="rounded-md p-1 hover:bg-[#F4F4F0] cursor-pointer dark:hover:bg-[#22252F]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#F0F0EB] p-4 dark:divide-[#22252F]">
              {(heldSalesQuery.data?.data ?? []).length === 0 ? (
                <p className="py-12 text-center text-sm text-[#646975]">No held orders right now.</p>
              ) : (
                (heldSalesQuery.data?.data ?? []).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <div className="font-mono text-xs font-semibold">
                        {sale.transaction_number}
                      </div>
                      <div className="text-xs text-[#646975] tabular-nums">
                        {formatCurrency(sale.grand_total)}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleResumeHeld(sale.id)}>
                      Resume
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E4E4DF] bg-white p-5 shadow-xl space-y-4 dark:border-[#242730] dark:bg-[#14161B]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Transaction Receipt</h3>
                <p className="font-mono text-xs text-[#646975]">{receipt.transaction_number}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={receiptPaper === "58mm" ? "default" : "outline"}
                  onClick={() => setReceiptPaper("58mm")}
                >
                  58mm
                </Button>
                <Button
                  size="sm"
                  variant={receiptPaper === "80mm" ? "default" : "outline"}
                  onClick={() => setReceiptPaper("80mm")}
                >
                  80mm
                </Button>
              </div>
            </div>
            <pre className="max-h-96 overflow-auto rounded-xl border border-[#E4E4DF] bg-[#FAFAF8] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#14171F] dark:border-[#242730] dark:bg-[#0C0D10] dark:text-[#E5E7EB]">
              {receipt.thermal_text}
            </pre>
            <div className="flex items-center justify-between pt-1">
              <Badge variant="success">Paid · Change {formatCurrency(receipt.change_amount)}</Badge>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    printThermalReceipt(
                      receipt.thermal_text,
                      receiptPaper,
                      receipt.transaction_number
                    )
                  }
                >
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button
                  className="bg-[#0F766E] text-white hover:bg-[#0D655E]"
                  onClick={() => setReceipt(null)}
                >
                  New Sale
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
