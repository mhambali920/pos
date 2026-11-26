"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  LogIn,
  Minus,
  Pause,
  Pencil,
  Plus,
  QrCode,
  RotateCcw,
  ScanBarcode,
  Search,
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
  User as UserIcon,
  Wallet,
  X,
} from "lucide-react";
import {
  Alert,
  AspectRatio,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  EmptyState,
  IconButton,
  Input,
  Kbd,
  Skeleton,
  useToast,
} from "@eta-ui/react";
import { ClientThemeToggle } from "@/components/shared/client-theme-toggle";
import { apiFetch, ApiError } from "@/lib/api";
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
import {
  getCustomerTypeLabel,
  PosCustomerDrawer,
} from "@/components/pos/pos-customer-drawer";
import { PosHeldDrawer } from "@/components/pos/pos-held-drawer";
import { PosReceiptDialog } from "@/components/pos/pos-receipt-dialog";

const QUICK_CASH_AMOUNTS = [50_000, 100_000, 200_000] as const;

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
  const { toast } = useToast();
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

  // Customer Selector Sheet state
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

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
    <div className="flex h-dvh flex-col overflow-hidden bg-eta-base text-eta-heading">
      {/* Top Header Bar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-eta-border bg-eta-surface/90 px-4 py-2 backdrop-blur-md lg:h-16 lg:flex-nowrap lg:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:flex-none">
          <Button
            asChild
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          >
            <Link href="/" aria-label="Back to backoffice">
              <span className="hidden sm:inline">Backoffice</span>
            </Link>
          </Button>

          <Divider orientation="vertical" spacing="none" className="hidden h-6 sm:block" />

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-eta-primary text-eta-inverse">
              <StoreIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-sm font-semibold tracking-tight text-eta-heading sm:text-base">
                {activeStore ? activeStore.name : "POS Register"}
              </h1>
              <p className="flex items-center gap-1.5 truncate text-xs text-eta-muted">
                {activeStore && (
                  <>
                    <span className="font-mono font-medium text-eta-heading">
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

        {/* Center: Quick Scan Input */}
        <form
          onSubmit={handleBarcodeScan}
          className="order-last flex w-full items-center lg:order-none lg:mx-auto lg:w-auto lg:max-w-sm lg:flex-1"
        >
          <label htmlFor="pos-barcode" className="sr-only">
            Scan SKU atau Barcode
          </label>
          <Input
            id="pos-barcode"
            ref={barcodeInputRef}
            size="sm"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            disabled={!isAuthenticated}
            autoComplete="off"
            placeholder="Scan SKU / Barcode..."
            leftAdornment={<ScanBarcode className="h-4 w-4" aria-hidden="true" />}
            rightAdornment={<Kbd size="sm">F2</Kbd>}
            wrapperClassName="w-full"
            className="font-mono text-xs"
          />
        </form>

        {/* Right: Theme Toggle & Held Orders */}
        <div className="flex items-center gap-1.5">
          <ClientThemeToggle variant="icon" size="sm" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHeldDrawerOpen(true)}
            disabled={!isAuthenticated}
            aria-label={`Held Orders, ${heldCount}`}
          >
            <span>Held Orders</span>
            <Badge
              variant="soft"
              color={heldCount > 0 ? "warning" : "neutral"}
              size="sm"
              className="font-mono tabular-nums"
            >
              {heldCount}
            </Badge>
          </Button>
        </div>
      </header>

      {/* Main Split Workspace */}
      {!isAuthenticated ? (
        <main className="flex flex-1 items-center justify-center p-6">
          <Card variant="elevated" padding="lg" className="w-full max-w-md text-center">
            <CardBody className="flex flex-col items-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-eta-subtle text-eta-heading">
                <LogIn className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-eta-heading">
                Sesi Kasir Diperlukan
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-eta-muted">
                Masuk dengan akun outlet Anda (default:{" "}
                <code className="rounded bg-eta-subtle px-1.5 py-0.5 font-mono text-xs text-eta-heading">
                  admin@pos.local
                </code>
                ) untuk memuat katalog produk, pelanggan, dan metode pembayaran.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild variant="solid" color="primary">
                  <Link href="/login">Masuk ke Kasir</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">Kembali ke Dashboard</Link>
                </Button>
              </div>
            </CardBody>
          </Card>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 overflow-hidden">
          {/* LEFT PANE: CATALOGUE & SEARCH */}
          <section
            aria-label="Katalog Produk"
            className="flex min-w-0 flex-1 flex-col overflow-hidden bg-eta-base lg:border-r lg:border-eta-border"
          >
            {/* Action Toolbar: Search + Category Filter Pills */}
            <div className="flex flex-col gap-3 border-b border-eta-border bg-eta-surface/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[240px] max-w-xl flex-1">
                  <label htmlFor="pos-search" className="sr-only">
                    Cari SKU atau Nama Produk
                  </label>
                  <Input
                    id="pos-search"
                    ref={searchInputRef}
                    type="search"
                    size="sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari SKU, Nama Produk, atau Scan Barcode EAN-13..."
                    leftAdornment={<Search className="h-4 w-4" aria-hidden="true" />}
                    rightAdornment={
                      search ? (
                        <IconButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
                          aria-label="Hapus pencarian"
                          onClick={() => setSearch("")}
                        />
                      ) : (
                        <div className="hidden items-center gap-1 sm:flex">
                          <Kbd size="sm">⌘K</Kbd>
                          <Kbd size="sm">F1</Kbd>
                        </div>
                      )
                    }
                    wrapperClassName="w-full"
                    className="text-xs [&::-webkit-search-cancel-button]:hidden"
                  />
                </div>
              </div>

              {/* Category Pill Badges with Live Counts */}
              <div
                role="group"
                aria-label="Filter kategori produk"
                className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={categoryId === null ? "solid" : "outline"}
                  color="primary"
                  aria-pressed={categoryId === null}
                  onClick={() => setCategoryId(null)}
                  className="shrink-0 whitespace-nowrap"
                >
                  <span>Semua Produk</span>
                  <Badge
                    variant="soft"
                    color="neutral"
                    size="sm"
                    className="font-mono tabular-nums"
                  >
                    {productTiles.length}
                  </Badge>
                </Button>

                {categories.map((cat) => {
                  const isActive = categoryId === cat.id;
                  const count = categoryCounts.get(cat.id);
                  return (
                    <Button
                      key={cat.id}
                      type="button"
                      size="sm"
                      variant={isActive ? "solid" : "outline"}
                      color="primary"
                      aria-pressed={isActive}
                      onClick={() => setCategoryId(cat.id)}
                      className="shrink-0 whitespace-nowrap"
                    >
                      <span>{cat.name}</span>
                      {count !== undefined && (
                        <Badge
                          variant="soft"
                          color="neutral"
                          size="sm"
                          className="font-mono tabular-nums"
                        >
                          {count}
                        </Badge>
                      )}
                    </Button>
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
                    <Skeleton key={idx} variant="rounded" height={200} />
                  ))}
                </div>
              ) : productsQuery.isError ? (
                <div className="mx-auto mt-10 max-w-md">
                  <Alert
                    status="error"
                    variant="soft"
                    title="Gagal memuat katalog produk"
                    description={
                      productsQuery.error instanceof Error
                        ? productsQuery.error.message
                        : "Terjadi kesalahan saat mengambil data produk."
                    }
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                        onClick={() => void productsQuery.refetch()}
                      >
                        Coba Lagi
                      </Button>
                    }
                  />
                </div>
              ) : productTiles.length === 0 ? (
                <div className="mx-auto mt-10 max-w-sm">
                  <EmptyState
                    variant="bordered"
                    icon={<ShoppingBag className="h-7 w-7" aria-hidden="true" />}
                    title={
                      search || categoryId !== null
                        ? "Produk tidak ditemukan"
                        : "Katalog masih kosong"
                    }
                    description={
                      search || categoryId !== null
                        ? "Coba ubah kata kunci pencarian atau pilih kategori lain."
                        : "Tambahkan produk di Backoffice untuk mulai bertransaksi."
                    }
                    action={
                      search || categoryId !== null ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setCategoryId(null);
                          }}
                        >
                          Reset Filter
                        </Button>
                      ) : undefined
                    }
                  />
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
                        className="group cursor-pointer text-left focus-visible:outline-none active:scale-[0.985]"
                      >
                        <Card
                          variant="outline"
                          padding="sm"
                          isInteractive
                          className={cn(
                            "flex h-full flex-col justify-between transition-all",
                            inCartQty > 0 && "border-eta-primary ring-1 ring-eta-primary/30"
                          )}
                        >
                          <CardBody className="flex h-full flex-col justify-between p-0">
                            <div className="w-full">
                              <div className="relative mb-2.5 overflow-hidden rounded-md border border-eta-border bg-eta-subtle">
                                <AspectRatio ratio={4 / 3}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={
                                      product.image_path ||
                                      "/images/products/placeholder.svg"
                                    }
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
                                        e.currentTarget.src =
                                          "/images/products/placeholder.svg";
                                      }
                                    }}
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                  />
                                </AspectRatio>
                                <Badge
                                  variant="soft"
                                  color="neutral"
                                  size="sm"
                                  className="absolute left-1.5 top-1.5 font-mono backdrop-blur-sm"
                                >
                                  {variant.sku}
                                </Badge>
                                {inCartQty > 0 && (
                                  <Badge
                                    variant="solid"
                                    color="success"
                                    size="sm"
                                    aria-hidden="true"
                                    className="absolute right-1.5 top-1.5 font-mono tabular-nums"
                                  >
                                    ×{inCartQty}
                                  </Badge>
                                )}
                              </div>

                              <span className="mb-0.5 block truncate text-[10px] font-medium uppercase tracking-wider text-eta-muted">
                                {product.category?.name ?? "Produk"}
                              </span>
                              <h3 className="line-clamp-1 text-xs font-semibold text-eta-heading">
                                {label}
                              </h3>
                            </div>

                            <div className="mt-3 flex w-full items-center justify-between border-t border-eta-border pt-2">
                              <span className="font-mono text-sm font-semibold tabular-nums text-eta-heading">
                                {formatCurrency(variant.selling_price)}
                              </span>
                              <span
                                aria-hidden="true"
                                className="flex size-7 items-center justify-center rounded-md border border-eta-border bg-eta-subtle text-eta-heading transition-colors group-hover:border-eta-primary group-hover:bg-eta-primary group-hover:text-eta-inverse"
                              >
                                <Plus className="h-4 w-4" />
                              </span>
                            </div>
                          </CardBody>
                        </Card>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT PANE: ACTIVE ORDER TICKET & CHECKOUT PANEL */}
          <aside
            aria-label="Pesanan Aktif"
            className={cn(
              "w-full flex-col justify-between bg-eta-surface lg:static lg:z-auto lg:flex lg:w-[410px] lg:shrink-0 xl:w-[440px]",
              ticketOpen ? "fixed inset-0 z-40 flex bg-eta-surface" : "hidden"
            )}
          >
            {/* Ticket Header & Customer Bar */}
            <div className="flex flex-col gap-3 border-b border-eta-border bg-eta-surface p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-eta-heading">Pesanan Aktif</h2>
                  <Badge
                    variant="soft"
                    color="neutral"
                    size="sm"
                    className="font-mono tabular-nums"
                  >
                    {totalItemCount} Item
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  {clockText && (
                    <span className="font-mono text-[11px] text-eta-muted tabular-nums">
                      {clockText} WIB
                    </span>
                  )}
                  <IconButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => {
                      clearCart();
                      resetPaymentInputs();
                    }}
                    disabled={items.length === 0}
                    title="Kosongkan Keranjang"
                    aria-label="Kosongkan Keranjang"
                  />
                  <IconButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<X className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => setTicketOpen(false)}
                    aria-label="Tutup panel pesanan"
                    className="lg:hidden"
                  />
                </div>
              </div>

              {/* Customer Bar */}
              <div className="flex items-center justify-between rounded-md border border-eta-border bg-eta-base p-2 transition-colors hover:border-eta-heading/25">
                <button
                  type="button"
                  onClick={() => setCustomerSheetOpen(true)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left focus-visible:outline-none"
                >
                  <Avatar
                    name={activeCustomer?.name}
                    fallback={<UserIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                    size="sm"
                    shape="circle"
                  />
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-eta-heading">
                        {activeCustomer ? activeCustomer.name : "Walk-in Customer"}
                      </span>
                      {activeCustomer && (
                        <Badge
                          variant="soft"
                          color="neutral"
                          size="sm"
                          className="shrink-0 font-mono"
                        >
                          {getCustomerTypeLabel(activeCustomer.customer_type)}
                        </Badge>
                      )}
                    </div>
                    <span className="truncate font-mono text-[10px] text-eta-muted">
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
                <IconButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() => setCustomerSheetOpen(true)}
                  title="Ubah Pelanggan"
                  aria-label="Ubah Pelanggan"
                  className="ml-2 shrink-0"
                />
              </div>
            </div>

            {/* Ticket Items List */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
              {items.length === 0 ? (
                <div className="flex h-full min-h-40 items-center justify-center py-8">
                  <EmptyState
                    size="sm"
                    icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
                    title="Keranjang masih kosong"
                    description="Scan barcode atau klik produk di sebelah kiri untuk menambahkan ke pesanan."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-eta-border">
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
                          <div className="size-11 shrink-0 overflow-hidden rounded-md border border-eta-border bg-eta-subtle">
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
                            <span className="mb-0.5 block truncate text-xs font-medium text-eta-heading">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-eta-muted tabular-nums">
                              <span>{formatCurrency(item.unitPrice)}</span>
                              <span>×</span>
                              <span className="font-medium text-eta-heading">
                                {item.quantity}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded border border-eta-border bg-eta-base p-0.5">
                            <IconButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              icon={<Minus className="h-3 w-3" aria-hidden="true" />}
                              aria-label={`Kurangi jumlah ${item.name}`}
                              onClick={() =>
                                updateQuantity(item.productVariantId, item.quantity - 1)
                              }
                              className="size-6 min-w-0 p-0"
                            />
                            <span
                              aria-label={`Jumlah ${item.quantity}`}
                              className="w-6 text-center font-mono text-xs font-medium text-eta-heading tabular-nums"
                            >
                              {item.quantity}
                            </span>
                            <IconButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              icon={<Plus className="h-3 w-3" aria-hidden="true" />}
                              aria-label={`Tambah jumlah ${item.name}`}
                              onClick={() =>
                                updateQuantity(item.productVariantId, item.quantity + 1)
                              }
                              className="size-6 min-w-0 p-0"
                            />
                          </div>

                          <div className="relative flex min-w-[76px] items-center justify-end">
                            <span className="text-right font-mono text-xs font-semibold tabular-nums text-eta-heading transition-opacity group-hover:opacity-20">
                              {formatCurrency(lineTotal)}
                            </span>
                            <IconButton
                              type="button"
                              variant="soft"
                              color="danger"
                              size="sm"
                              icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                              onClick={() => removeItem(item.productVariantId)}
                              title="Hapus Item"
                              aria-label={`Hapus ${item.name}`}
                              className="pointer-events-none absolute right-0 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Billing Breakdown & Payment Methods */}
            <div className="flex flex-col gap-3 border-t border-eta-border bg-eta-surface p-4">
              {/* Summary Card */}
              <Card variant="filled" padding="sm">
                <CardBody className="flex flex-col gap-1.5 p-0">
                  <div className="flex items-center justify-between text-xs text-eta-muted">
                    <span>Subtotal ({totalItemCount} Item)</span>
                    <span className="font-mono tabular-nums text-eta-heading">
                      {formatCurrency(subtotalPreview)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-eta-muted">
                    <label htmlFor="pos-discount">Diskon Keranjang</label>
                    <Input
                      id="pos-discount"
                      type="number"
                      inputMode="numeric"
                      size="sm"
                      min={0}
                      placeholder="0"
                      value={discountInput}
                      onChange={(e) => {
                        setDiscountInput(e.target.value);
                        setCartDiscount(Number.parseFloat(e.target.value) || 0);
                      }}
                      leftAdornment={
                        <span className="font-mono text-[10px] text-eta-muted">Rp</span>
                      }
                      wrapperClassName="w-28"
                      className="text-right font-mono text-xs tabular-nums"
                    />
                  </div>
                  <Divider spacing="none" className="my-1" />
                  <div className="flex items-baseline justify-between pt-0.5">
                    <div>
                      <span className="block text-[10px] font-medium uppercase tracking-wider text-eta-muted">
                        Total Tagihan
                      </span>
                      <span className="font-mono text-[11px] text-eta-muted tabular-nums">
                        {totalItemCount} Barang Terdaftar
                      </span>
                    </div>
                    <span className="font-mono text-2xl font-bold tracking-tight tabular-nums text-eta-heading">
                      {formatCurrency(grandTotalPreview)}
                    </span>
                  </div>
                </CardBody>
              </Card>

              {/* Payment Methods Selector */}
              <div>
                <span className="mb-1.5 block text-[11px] font-medium text-eta-muted">
                  Pilih Metode Pembayaran
                </span>
                {paymentMethodsQuery.isLoading ? (
                  <div role="status" className="grid grid-cols-4 gap-1.5">
                    <Skeleton variant="rounded" height={48} />
                    <Skeleton variant="rounded" height={48} />
                    <Skeleton variant="rounded" height={48} />
                    <Skeleton variant="rounded" height={48} />
                  </div>
                ) : paymentMethodsQuery.isError ? (
                  <Alert
                    status="error"
                    variant="soft"
                    size="sm"
                    title="Gagal memuat metode pembayaran"
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void paymentMethodsQuery.refetch()}
                      >
                        Coba Lagi
                      </Button>
                    }
                  />
                ) : methods.length === 0 ? (
                  <p className="text-xs text-eta-muted">
                    Belum ada metode pembayaran aktif.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {methods.slice(0, 8).map((m) => {
                      const selected = activeMethod?.id === m.id;
                      return (
                        <Button
                          key={m.id}
                          type="button"
                          size="sm"
                          variant={selected ? "solid" : "outline"}
                          color="primary"
                          aria-pressed={selected}
                          onClick={() => setSelectedMethodId(m.id)}
                          className="h-auto flex-col gap-0.5 px-1 py-2"
                        >
                          <PaymentMethodIcon type={m.type} className="h-4 w-4" />
                          <span className="max-w-full truncate text-[11px] font-medium">
                            {m.name}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Cash Inputs & Tender Calculation */}
              {isCashMethod && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="pos-tendered" className="text-eta-muted">
                      Nominal Diterima
                    </label>
                    {tenderedAmount > 0 && (
                      <span
                        role="status"
                        className={cn(
                          "font-mono text-[11px] font-medium tabular-nums",
                          isCashInsufficient ? "text-eta-danger" : "text-eta-success"
                        )}
                      >
                        {isCashInsufficient
                          ? `Kurang: ${formatCurrency(grandTotalPreview - tenderedAmount)}`
                          : `Kembalian: ${formatCurrency(changePreview)}`}
                      </span>
                    )}
                  </div>

                  <div className="mb-0.5 grid grid-cols-4 gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        tenderedAmount > 0 && tenderedAmount === grandTotalPreview
                          ? "soft"
                          : "outline"
                      }
                      onClick={() => setTenderedInput(String(grandTotalPreview))}
                      className="h-7 px-1 font-mono text-[11px]"
                    >
                      Uang Pas
                    </Button>
                    {QUICK_CASH_AMOUNTS.map((amount) => {
                      const activeChip = tenderedAmount === amount;
                      return (
                        <Button
                          key={amount}
                          type="button"
                          size="sm"
                          variant={activeChip ? "soft" : "outline"}
                          onClick={() => setTenderedInput(String(amount))}
                          className="h-7 px-1 font-mono text-[11px] tabular-nums"
                        >
                          {amount.toLocaleString("id-ID")}
                        </Button>
                      );
                    })}
                  </div>

                  <Input
                    id="pos-tendered"
                    type="number"
                    inputMode="numeric"
                    size="md"
                    min={0}
                    placeholder="0"
                    value={tenderedInput}
                    onChange={(e) => setTenderedInput(e.target.value)}
                    isInvalid={isCashInsufficient}
                    leftAdornment={
                      <span className="font-mono text-xs font-semibold text-eta-muted">
                        Rp
                      </span>
                    }
                    rightAdornment={
                      tenderedAmount > 0 && !isCashInsufficient ? (
                        <CheckCircle2
                          aria-hidden="true"
                          className="h-4 w-4 text-eta-success"
                        />
                      ) : undefined
                    }
                    className="font-mono text-sm font-semibold tabular-nums"
                  />
                </div>
              )}

              {/* Primary Checkout Button Actions */}
              <div className="flex items-center gap-2 pt-1">
                <IconButton
                  type="button"
                  variant="outline"
                  size="lg"
                  icon={<Pause className="h-4 w-4" aria-hidden="true" />}
                  onClick={handleHold}
                  disabled={items.length === 0 || processing}
                  title="Tahan Pesanan (F4)"
                  aria-label="Tahan Pesanan"
                />
                <Button
                  type="button"
                  variant="solid"
                  color="primary"
                  size="lg"
                  isLoading={processing}
                  onClick={handleCheckout}
                  disabled={
                    items.length === 0 ||
                    processing ||
                    isCashInsufficient ||
                    !activeMethod
                  }
                  rightIcon={
                    !processing ? (
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    ) : undefined
                  }
                  className="flex-[2] font-semibold tracking-wide"
                >
                  {processing
                    ? "MEMPROSES..."
                    : `BAYAR SEKARANG · ${formatCurrency(grandTotalPreview)}`}
                </Button>
              </div>
            </div>
          </aside>

          {/* Mobile Sticky Checkout Bar */}
          <div className="fixed inset-x-0 bottom-7 z-30 border-t border-eta-border bg-eta-surface p-3 lg:hidden">
            <Button
              type="button"
              variant="solid"
              color="primary"
              size="lg"
              onClick={() => setTicketOpen(true)}
              className="w-full justify-between font-semibold"
            >
              <span>PESANAN AKTIF ({totalItemCount} ITEM)</span>
              <span className="font-mono text-sm tabular-nums">
                {formatCurrency(grandTotalPreview)}
              </span>
            </Button>
          </div>
        </main>
      )}

      {/* Fixed Bottom Status & Keyboard Shortcut Bar */}
      <footer className="flex h-7 shrink-0 items-center justify-between border-t border-eta-border bg-eta-surface px-4 text-[11px] text-eta-muted">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex size-2 rounded-full bg-eta-success"
          />
          <span className="hidden md:inline">
            Enterprise POS · {activeStore?.code ?? "Register"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Kbd size="sm">F1</Kbd>
            <span>Cari</span>
          </div>
          <div className="flex items-center gap-1">
            <Kbd size="sm">F2</Kbd>
            <span>Scan</span>
          </div>
          <div className="flex items-center gap-1">
            <Kbd size="sm">F4</Kbd>
            <span>Tahan</span>
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <Kbd size="sm">F8</Kbd>
            <span>Tunai</span>
          </div>
        </div>
      </footer>

      {/* Modular Overlays */}
      <PosCustomerDrawer
        open={customerSheetOpen}
        onOpenChange={setCustomerSheetOpen}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={setSelectedCustomerId}
        customers={customers}
        isLoading={customersQuery.isLoading}
        isError={customersQuery.isError}
        onRefetch={() => void customersQuery.refetch()}
        customerSearch={customerSearch}
        onCustomerSearchChange={setCustomerSearch}
      />

      <PosHeldDrawer
        open={heldDrawerOpen}
        onOpenChange={setHeldDrawerOpen}
        heldSales={heldSales}
        isLoading={heldSalesQuery.isLoading}
        isError={heldSalesQuery.isError}
        onRefetch={() => void heldSalesQuery.refetch()}
        onResume={handleResumeHeld}
      />

      <PosReceiptDialog
        receipt={receipt}
        onClose={() => setReceipt(null)}
        paperSize={receiptPaper}
        onPaperSizeChange={setReceiptPaper}
      />
    </div>
  );
}
