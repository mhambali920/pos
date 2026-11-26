# UI Redesign Plan — Migrasi Full Dashboard & POS ke `@eta-ui/react`

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-016` |
| **Version** | `1.1.0` |
| **Status** | `Completed` |
| **Last Updated** | `2026-11-26` |
| **Author** | Principal Frontend Architect (AI Agent) |
| **Target Package** | `@eta-ui/react@^0.5.0` |

---

## 1. Executive Summary, Scope & Strict Guardrails

Dokumen ini adalah panduan eksekusi langkah-demi-langkah (*deterministic execution playbook*) untuk meredesain **100% antarmuka `frontend/`** (halaman Login, Backoffice Dashboard Shell + 14 rute dashboard + Product Form, serta Fullscreen POS Terminal) menggunakan **`@eta-ui/react@0.5.0`** — lalu menghapus seluruh komponen UI lama (`shadcn/ui` / `@base-ui/react`) dan meng-*uninstall* seluruh dependensi UI yang tidak lagi dipakai.

`@eta-ui/react@0.5.0` dibangun di atas **Radix UI primitives**, token CSS custom properties (`--eta-*`), **CSS Modules zero-runtime**, dan mendukung **Tailwind CSS v4 Cascade Layers** melalui `@eta-ui/react/styles.layer.css`.

### Aturan Ketat (NON-NEGOTIABLE GUARDRAILS)

1. **Zero Backend Changes**: DILARANG mengubah file apa pun di dalam folder `backend/`.
2. **Zero Business Logic / API Contract Changes**:
   - Pertahankan 100% kontrak API dan logika di `frontend/src/lib/api.ts` (`apiFetch`, `ApiError`), `frontend/src/lib/print-receipt.ts` (`printThermalReceipt`), `frontend/src/lib/types.ts`, `frontend/src/stores/auth-store.ts`, dan `frontend/src/stores/pos-cart-store.ts`.
   - Pertahankan seluruh `queryKey` TanStack Query, skema validasi Zod, `Idempotency-Key` (`crypto.randomUUID()`), dan pengiriman header `X-Store-Id`.
3. **Preserve Next.js 16 `cacheComponents: true` Boundaries**:
   - `frontend/next.config.ts` mengaktifkan `cacheComponents: true` dan `partialPrefetching: true`.
   - WAJIB mempertahankan `<Suspense>` boundary yang membungkus komponen pemanggil hook dinamis seperti `usePathname()` atau `useParams()` (khususnya `DashboardShell` -> `<Suspense><SidebarNav /></Suspense>` dan `products/[id]/edit/page.tsx`).
4. **Preserve POS Ergonomics & Shortcuts**:
   - Pertahankan seluruh keyboard shortcut di `/pos`:
     - `F1` / `Cmd+K` / `Ctrl+K` → fokus ke input pencarian produk
     - `F2` → fokus ke input scan barcode
     - `F4` → buka/tutup drawer Held Orders
     - `F8` → pilih metode pembayaran Tunai (`cash`)
     - `Esc` → reset pencarian/barcode atau tutup panel mobile ticket
   - Pertahankan auto-focus input barcode, alur hold/resume transaksi, thermal print `58mm`/`80mm`, dan quick-add customer.
5. **No Premature Cleanup**:
   - **DILARANG** menghapus file di `frontend/src/components/ui/*` atau menjalankan `npm uninstall` sebelum **Wave 8** (setelah 100% halaman dan komponen ter-migrasi dan lolos verifikasi TypeScript & ESLint).
6. **No Auto Git Commit**:
   - DILARANG menjalankan `git commit` kecuali diminta secara eksplisit oleh pengguna.

---

## 2. Execution Protocol for Lower-Capability AI Agents

Untuk menghindari halusinasi API atau error berantai, agen eksekutor **WAJIB** mengikuti siklus 5 langkah berikut pada setiap Wave:

1. **Read Before Edit**: Baca file target dengan `read_file` dan cocokkan setiap komponen/prop dengan **Section 4 (API Cheat Sheet)** sebelum mulai mengedit.
2. **Strict Wave Order**: Kerjakan secara berurutan dari **Wave 0 → Wave 8**. Jangan melompati Wave dan jangan mengedit file di luar daftar Wave yang sedang aktif.
3. **Never Guess Props or Exports**: `@eta-ui/react@0.5.0` memiliki perbedaan nama komponen dan prop dibanding `shadcn/ui` (`@base-ui/react`). Gunakan **hanya** nama komponen, varian, ukuran, dan prop yang tercantum di Section 4.
4. **Mandatory Wave Gate Check**: Setelah menyelesaikan semua task dalam satu Wave, jalankan perintah gerbang verifikasi:
   ```bash
   cd frontend && npx tsc --noEmit && npm run lint
   ```
   **Syarat Lanjut**: `tsc` dan `eslint` **WAJIB 0 errors** sebelum memulai Wave berikutnya.
5. **Update Progress Checkboxes**: Tandai `[x]` pada setiap sub-task yang selesai di dokumen ini agar status migrasi selalu akurat jika sesi terputus.

---

## 3. Design System, Theme & Foundation Templates (Copy-Paste Ready)

### Keputusan Tema & Palet Warna

- Gunakan preset default **Sage** bawaan `@eta-ui/react@0.5.0` (`#6B9080` light / `#84A98C` dark di atas permukaan alabaster hangat `#FAF9F6` / slate gelap `#181A20`).
- **Alasan**:
  1. Seluruh token `--eta-*` (surface, solid, soft, outline, status success/warning/error/info, chart tokens) sudah memenuhi standar kontras **WCAG 2.1 AA (>= 4.5:1)** tanpa perlu menulis CSS override manual.
  2. `ThemeProvider` dari `@eta-ui/react` secara otomatis mengelola `light`, `dark`, dan `system` melalui `localStorage` (`eta-ui-theme`) serta menyetel atribut `data-theme`, class `.dark`, dan `color-scheme` pada `<html>`.
- *(Opsional)* Jika di kemudian hari tim menginginkan warna aksen biru korporat, gunakan blok override **Cobalt** di **Section 9 (Appendix)**.

---

### Template 3.1 — `frontend/src/app/globals.css`

Ganti isi `frontend/src/app/globals.css` dengan template di bawah ini.

> [!IMPORTANT]
> Blok `/* TEMPORARY LEGACY SHADCN ALIASES — REMOVE IN WAVE 8 */` wajib dipertahankan selama **Wave 0–7** agar halaman yang belum dimigrasi tetap memiliki warna & border valid saat build. Blok tersebut **WAJIB dihapus pada Wave 8**.

```css
@import "tailwindcss";
@import "@eta-ui/react/styles.layer.css";

@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));

@theme inline {
  --color-eta-base: var(--eta-bg-base);
  --color-eta-surface: var(--eta-bg-surface);
  --color-eta-subtle: var(--eta-bg-subtle);
  --color-eta-hover: var(--eta-bg-hover);

  --color-eta-primary: var(--eta-color-primary);
  --color-eta-primary-hover: var(--eta-color-primary-hover);
  --color-eta-primary-subtle: var(--eta-color-primary-subtle);
  --color-eta-secondary: var(--eta-color-secondary);

  --color-eta-heading: var(--eta-text-heading);
  --color-eta-body: var(--eta-text-body);
  --color-eta-muted: var(--eta-text-muted);
  --color-eta-inverse: var(--eta-text-inverse);

  --color-eta-border: var(--eta-border-default);
  --color-eta-border-focus: var(--eta-border-focus);

  --color-eta-success: var(--eta-status-success-solid);
  --color-eta-success-bg: var(--eta-status-success-bg);
  --color-eta-success-text: var(--eta-status-success-text);

  --color-eta-warning: var(--eta-status-warning-solid);
  --color-eta-warning-bg: var(--eta-status-warning-bg);
  --color-eta-warning-text: var(--eta-status-warning-text);

  --color-eta-danger: var(--eta-status-error-solid);
  --color-eta-danger-bg: var(--eta-status-error-bg);
  --color-eta-danger-text: var(--eta-status-error-text);

  --color-eta-info: var(--eta-status-info-solid);
  --color-eta-info-bg: var(--eta-status-info-bg);
  --color-eta-info-text: var(--eta-status-info-text);

  --font-sans: var(--eta-font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--eta-font-sans);

  /* TEMPORARY LEGACY SHADCN ALIASES — REMOVE IN WAVE 8 */
  --color-background: var(--eta-bg-base);
  --color-foreground: var(--eta-text-heading);
  --color-card: var(--eta-bg-surface);
  --color-card-foreground: var(--eta-text-heading);
  --color-popover: var(--eta-bg-surface);
  --color-popover-foreground: var(--eta-text-heading);
  --color-primary: var(--eta-color-primary);
  --color-primary-foreground: var(--eta-text-inverse);
  --color-secondary: var(--eta-bg-subtle);
  --color-secondary-foreground: var(--eta-text-heading);
  --color-muted: var(--eta-bg-subtle);
  --color-muted-foreground: var(--eta-text-muted);
  --color-accent: var(--eta-bg-subtle);
  --color-accent-foreground: var(--eta-text-heading);
  --color-destructive: var(--eta-status-error-solid);
  --color-destructive-foreground: #ffffff;
  --color-border: var(--eta-border-default);
  --color-input: var(--eta-border-default);
  --color-ring: var(--eta-border-focus);
  --color-sidebar: var(--eta-bg-surface);
  --color-sidebar-foreground: var(--eta-text-heading);
  --color-sidebar-primary: var(--eta-color-primary);
  --color-sidebar-primary-foreground: var(--eta-text-inverse);
  --color-sidebar-accent: var(--eta-bg-subtle);
  --color-sidebar-accent-foreground: var(--eta-text-heading);
  --color-sidebar-border: var(--eta-border-default);
  --color-sidebar-ring: var(--eta-border-focus);
  --radius-sm: var(--eta-radius-sm);
  --radius-md: var(--eta-radius-md);
  --radius-lg: var(--eta-radius-lg);
}

@layer base {
  body {
    font-family: var(--eta-font-sans), system-ui, -apple-system, sans-serif;
    background-color: var(--eta-bg-base);
    color: var(--eta-text-body);
  }
}
```

---

### Template 3.2 — `frontend/src/app/layout.tsx`

Tambahkan `ThemeScript` di `<head>` untuk mencegah kedipan (*flash*) dark mode saat SSR, dan bind `Geist` ke `--eta-font-sans`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeScript } from "@eta-ui/react";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--eta-font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Enterprise POS — Retail & Operations Platform",
  description:
    "Multi-store Enterprise Point of Sales, Inventory, Purchasing, and Financial Management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript defaultTheme="system" />
      </head>
      <body className="min-h-full flex flex-col bg-eta-base text-eta-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

### Template 3.3 — `frontend/src/components/providers.tsx`

Ganti `next-themes`, `sonner`, dan `@/components/ui/tooltip` dengan `ThemeProvider`, `TooltipProvider`, dan `ToastProvider` dari `@eta-ui/react`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, ToastProvider, TooltipProvider } from "@eta-ui/react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ToastProvider position="top-right">{children}</ToastProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

---

### Template 3.4 — `frontend/src/lib/utils.ts`

Ganti sumber `cn` dari package `"cn"` menjadi `"@eta-ui/react"`, dan biarkan `formatCurrency` tetap utuh:

```ts
export { cn } from "@eta-ui/react";

export function formatCurrency(
  amount: number | string,
  currency = "IDR",
  locale = "id-ID"
): string {
  const numeric = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (Number.isNaN(numeric)) {
    return "Rp 0";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
}
```

---

### Template 3.5 — `frontend/src/components/shared/iso-date-picker.tsx`

Seluruh halaman dashboard dan API backend menggunakan string tanggal ISO **`"YYYY-MM-DD"`** (atau `""`), sedangkan `@eta-ui/react` `DatePicker` menerima dan mengembalikan objek `Date | undefined`. Buat adapter `IsoDatePicker` ini **tanpa `date-fns`** menggunakan parsing tanggal lokal yang aman dari bug geser zona waktu UTC:

```tsx
"use client";

import * as React from "react";
import { DatePicker, type DatePickerSize } from "@eta-ui/react";

interface IsoDatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  isInvalid?: boolean;
  size?: DatePickerSize;
  className?: string;
}

function parseIsoLocalDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

function formatIsoLocalDate(date: Date | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function IsoDatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date...",
  allowClear = false,
  disabled = false,
  isInvalid = false,
  size = "md",
  className,
}: IsoDatePickerProps) {
  const selectedDate = React.useMemo(() => parseIsoLocalDate(value), [value]);

  return (
    <DatePicker
      id={id}
      value={selectedDate}
      onChange={(nextDate) => onChange(formatIsoLocalDate(nextDate))}
      placeholder={placeholder}
      isClearable={allowClear}
      disabled={disabled}
      isInvalid={isInvalid}
      size={size}
      dateFormat="dd/mm/yyyy"
      className={className}
    />
  );
}
```

---

## 4. Exact Component & Prop Migration Cheat Sheet (`shadcn/@base-ui` → `@eta-ui/react@0.5.0`)

Gunakan tabel referensi di bawah ini setiap kali memigrasikan komponen. **Semua API telah diverifikasi langsung dari `dist/index.d.ts` milik `@eta-ui/react@0.5.0`.**

### 4.1 Button & IconButton

| Lama (`@/components/ui/button`) | Baru (`@eta-ui/react`) | Catatan Penting |
| :--- | :--- | :--- |
| `<Button variant="default">` | `<Button variant="solid" color="primary">` | `variant="default"` tidak ada di `@eta-ui/react`. |
| `<Button variant="destructive">` | `<Button variant="solid" color="danger">` | Untuk tombol hapus ringan di baris tabel, gunakan `variant="soft" color="danger"`. |
| `<Button variant="secondary">` | `<Button variant="soft" color="secondary">` | — |
| `<Button variant="outline">` | `<Button variant="outline">` | Sama. |
| `<Button variant="ghost">` | `<Button variant="ghost">` | Sama. |
| `<Button variant="link">` | `<Button variant="ghost" size="sm">` | `variant="link"` tidak ada di `@eta-ui/react`. |
| `size="xs"` | `size="sm"` | Ukuran hanya `'sm' \| 'md' \| 'lg'`. |
| `size="default"` | `size="md"` | Default sudah `'md'`. |
| `<Button size="icon" aria-label="...">` | `<IconButton icon={<Icon />} aria-label="..." size="sm" />` | `IconButton` wajib punya `icon` dan `aria-label`. |
| `render={<Link href="/" />} nativeButton={false}` | `<Button asChild><Link href="/">...</Link></Button>` | Radix `asChild` menggantikan Base UI `render`. |
| Loading text manual | `isLoading` prop pada `<Button>` | Otomatis menampilkan spinner. |

### 4.2 Badge

| Lama (`@/components/ui/badge`) | Baru (`@eta-ui/react`) |
| :--- | :--- |
| `<Badge variant="default">` | `<Badge variant="solid" color="primary">` |
| `<Badge variant="secondary">` | `<Badge variant="soft" color="secondary">` |
| `<Badge variant="destructive">` | `<Badge variant="soft" color="danger">` |
| `<Badge variant="success">` | `<Badge variant="soft" color="success">` |
| `<Badge variant="warning">` | `<Badge variant="soft" color="warning">` |
| `<Badge variant="muted">` | `<Badge variant="soft" color="neutral">` |
| `<Badge variant="outline">` | `<Badge variant="outline" color="neutral">` |

Props tambahan yang tersedia: `size?: 'sm' | 'md' | 'lg'`, `shape?: 'pill' | 'rounded'`, `hasDot?: boolean`, `leftIcon`, `rightIcon`.

### 4.3 Card

| Lama | Baru (`@eta-ui/react`) | Catatan |
| :--- | :--- | :--- |
| `<Card>` | `<Card variant="elevated" padding="md">` | Varian: `'elevated' \| 'outline' \| 'filled'`. Untuk tabel flush tanpa padding luar, gunakan `padding="none"`. Untuk card padat/POS, gunakan `padding="sm"`. |
| `<CardHeader>` | `<CardHeader>` | Sama. |
| `<CardTitle>` | `<CardTitle>` | Mendukung prop `as?: 'h1' \| ... \| 'h6'`. |
| `<CardDescription>` | `<CardDescription>` | Sama. |
| `<CardContent>` | **`<CardBody>`** | **WAJIB DIUBAH**: `CardContent` **TIDAK ADA** di `@eta-ui/react`! |
| `<CardFooter>` | `<CardFooter>` | Sama. |

### 4.4 Form Inputs (`Input`, `Textarea`, `FormField`, `FormLabel`, `Select`, `Checkbox`, `Switch`)

1. **`Label` tidak diekspor** oleh `@eta-ui/react`:
   - Gunakan `<FormField label="..." helperText="..." errorMessage="..." isRequired isInvalid={...}>` atau `<FormLabel htmlFor="...">`.
2. **`Input` & `Textarea`**:
   - `Input` mendukung `size?: 'sm' | 'md' | 'lg'`, `variant?: 'outline' | 'filled' | 'unstyled'`, `isInvalid`, `leftAdornment`, `rightAdornment`, `wrapperClassName`.
   - `Textarea` mendukung `size`, `variant`, `resize?: 'none' | 'vertical' | 'horizontal' | 'both'`, `isInvalid`.
3. **`Select`**:
   - Sub-komponen: `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectLabel`, `SelectSeparator`.
   - `SelectTrigger` mendukung `size?: 'sm' | 'md' | 'lg'`, `variant?: 'outline' | 'filled'`, `isInvalid`.
   - **ATURAN KRITIS RADIX SELECT**: `<SelectItem value="">` **AKAN MENYEBABKAN RUNTIME ERROR**! Pastikan tidak pernah menggunakan `""` sebagai `value` di `SelectItem` (gunakan `"all"` atau `"none"`). `onValueChange` menerima `(value: string) => void`.
4. **`Checkbox` & `Switch`**:
   - Mendukung prop `label`, `description`, `size?: 'sm' | 'md' | 'lg'`, `isInvalid`, `containerClassName`.
   - `Checkbox` `onCheckedChange` bertipe `(checked: boolean | 'indeterminate') => void` → selalu bungkus dengan `onCheckedChange={(v) => setter(Boolean(v))}`.

### 4.5 Overlays (`Dialog`, `AlertDialog`, `Drawer` / `Sheet`, `Popover`, `DropdownMenu`, `Tooltip`)

| Komponen | Perubahan API Penting |
| :--- | :--- |
| **`Dialog`** | Gunakan `Dialog`, `DialogTrigger` (`asChild`), `DialogContent` (`size?: 'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'`, `showCloseButton` default `true`), `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter`, `DialogClose`. |
| **`AlertDialog`** | Tersedia untuk konfirmasi destruktif: `AlertDialog`, `AlertDialogContent` (`intent?: 'danger' \| 'warning' \| 'info' \| 'primary'`), `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogBody`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`. |
| **`Sheet` / `Drawer`** | Keduanya diekspor sebagai alias identik! `SheetContent` menerima `side?: 'top' \| 'right' \| 'bottom' \| 'left'`, `size?: 'sm' \| 'md' \| 'lg' \| 'full'`, `showCloseButton` default `true`. Tersedia `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetBody`, `SheetFooter`. |
| **`Popover`** | Ganti `PopoverTrigger render={<Button ... />}` → `<PopoverTrigger asChild><Button ... /></PopoverTrigger>`. `PopoverContent` mendukung `size?: 'sm' \| 'md' \| 'lg' \| 'auto'`, `hasArrow`, `showCloseButton`, plus `PopoverHeader`, `PopoverTitle`, `PopoverBody`, `PopoverFooter`. |
| **`DropdownMenu`** | Ganti `DropdownMenuTrigger render={...}` → `asChild`. Ganti `DropdownMenuItem render={<Link ... />}` → `<DropdownMenuItem asChild><Link ... /></DropdownMenuItem>`. Ganti `variant="destructive"` → **`color="danger"`**. |
| **`Tooltip`** | Bisa dipakai langsung sebagai `<Tooltip content="..."><Button ... /></Tooltip>` atau komposisi `TooltipRoot` + `TooltipTrigger` (`asChild`) + `TooltipContent`. |

### 4.6 Navigation, Layout & Data Display

| Komponen | Perubahan API Penting |
| :--- | :--- |
| **`Sidebar`** | Ekspor: `SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuBadge`, `SidebarInset`, `SidebarTrigger`, `useSidebar`.<br>**TIDAK ADA**: `SidebarRail` (hapus `<SidebarRail />`), prop `tooltip` pada `SidebarMenuButton` (ganti dengan `title={item.label}` atau bungkus dengan `<Tooltip content={item.label}>` saat collapsed).<br>Ganti `render={<Link href={...} />}` pada `SidebarMenuButton` → `asChild`.<br>**PERHATIAN HTML**: `SidebarInset` merender elemen `<main>`! Jangan menaruh `<main>` lagi di dalam `DashboardShell` (gunakan `<div>`). |
| **`Avatar`** | `<Avatar name={user.name} size="sm" shape="circle" />` — menghasilkan inisial otomatis! **TIDAK ADA** `AvatarFallback`. |
| **`Divider`** | Menggantikan `Separator`: `<Divider orientation="vertical" spacing="sm" />` atau `<Divider spacing="none" />`. |
| **`Tabs`** | `Tabs` (`variant?: 'soft' \| 'underline' \| 'outline'`, `size?: 'sm' \| 'md' \| 'lg'`), `TabsList`, `TabsTrigger`, `TabsContent`. |
| **`Table`** | `Table` (`variant?: 'default' \| 'striped' \| 'hoverable'`, `size?: 'sm' \| 'md' \| 'lg'`, `bordered`, `containerClassName`), `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead` (`align`, `sortable`, `sortDirection`, `onSort`), `TableCell` (`align`), `TableEmpty` (`colSpan`, `icon`, `title`, `description`). |
| **`Stat` & `StatGroup`** | Untuk kartu KPI Dashboard: `<StatGroup>` + `<Stat variant="surface" label="..." value="..." helpText="..." icon={<... />} trend="up" trendValue="..." />`. |
| **`BarChart`** | Menggantikan `recharts` di Dashboard: `<BarChart data={chartData} indexKey="date" series={[{ key: "revenue", label: "Revenue", color: "primary" }]} height={260} valueFormatter={(v) => formatCurrency(v)} isLoading={...} emptyState={...} />`. |
| **`SegmentedControl`** | Alias `ToggleGroup`: `<SegmentedControl type="single" variant="segmented" size="sm" value={...} onValueChange={(v) => { if (typeof v === "string" && v) setter(v); }}>` + `<SegmentedControlItem value="...">`. |
| **`ScrollArea`** | `<ScrollArea orientation="vertical \| horizontal \| both">` + `ScrollBar`. |

### 4.7 Feedback, Toast & Theme

| Lama | Baru (`@eta-ui/react`) |
| :--- | :--- |
| `import { toast } from "sonner"` | `import { useToast } from "@eta-ui/react"` → `const { toast } = useToast();` di dalam komponen. Pemanggilan `toast.success("...")`, `toast.error("...")`, `toast.info("...")`, `toast.warning("...")` tetap sama! |
| `import { useTheme } from "next-themes"` + tombol custom Sun/Moon | `<ThemeToggle variant="icon" size="sm" />` (atau `useTheme` dari `@eta-ui/react`). |
| `<div className="animate-pulse ... bg-muted" />` | `<Skeleton variant="rounded" height={112} />` atau `<SkeletonText lines={3} />` |
| Empty state div manual | `<EmptyState variant="bordered" icon={<Icon />} title="..." description="..." action={<Button ... />} />` |
| Error box manual | `<Alert status="error" variant="soft" title="..." action={<Button ... />} />` |
| `<kbd>` manual di POS | `<Kbd size="sm">F2</Kbd>` |
| Aspect box `aspect-[4/3]` manual | `<AspectRatio ratio={4 / 3}>...</AspectRatio>` |

### 4.8 Tailwind Utility Class Mapping (`shadcn` → `@eta-ui`)

| Kelas Lama | Kelas Baru |
| :--- | :--- |
| `bg-background` | `bg-eta-base` |
| `bg-card` | `bg-eta-surface` |
| `bg-muted`, `bg-muted/40`, `bg-muted/60` | `bg-eta-subtle`, `bg-eta-subtle/50` |
| `text-foreground` | `text-eta-heading` |
| `text-muted-foreground` | `text-eta-muted` |
| `border-border` | `border-eta-border` |
| `bg-primary text-primary-foreground` | `bg-eta-primary text-eta-inverse` |
| `text-destructive` | `text-eta-danger` |
| `bg-destructive/10 text-destructive` | `bg-eta-danger-bg text-eta-danger-text` |
| `bg-emerald-500/15 text-emerald-700` | `bg-eta-success-bg text-eta-success-text` |
| `bg-amber-500/15 text-amber-700` | `bg-eta-warning-bg text-eta-warning-text` |

---

## 5. Complete File Inventory & Dependency Disposition Matrix

### 5.1 Package Dependency Disposition (`frontend/package.json`)

| Action | Package | Version / Notes |
| :--- | :--- | :--- |
| **INSTALL (Wave 0)** | `@eta-ui/react` | `^0.5.0` — Satu-satunya UI kit utama. |
| **REMOVE (Wave 8)** | `@base-ui/react` | Digantikan oleh Radix UI internal `@eta-ui/react`. |
| **REMOVE (Wave 8)** | `class-variance-authority` | Hanya dipakai di `src/components/ui/*`. |
| **REMOVE (Wave 8)** | `cn` | Digantikan `cn` export dari `@eta-ui/react`. |
| **REMOVE (Wave 8)** | `date-fns` | Hanya dipakai di `src/components/ui/date-picker.tsx`. |
| **REMOVE (Wave 8)** | `next-themes` | Digantikan `ThemeProvider`, `ThemeScript`, `ThemeToggle`, `useTheme` dari `@eta-ui/react`. |
| **REMOVE (Wave 8)** | `react-day-picker` | Digantikan `DatePicker` / `Calendar` dari `@eta-ui/react`. |
| **REMOVE (Wave 8)** | `recharts` | Digantikan `BarChart` dari `@eta-ui/react`. |
| **REMOVE (Wave 8)** | `shadcn` | CLI & stylesheet `shadcn/tailwind.css` tidak lagi dipakai. |
| **REMOVE (Wave 8)** | `sonner` | Digantikan `ToastProvider` & `useToast` dari `@eta-ui/react`. |
| **REMOVE (Wave 8)** | `tw-animate-css` | Tidak lagi diimpor di `globals.css`. |
| **KEEP** | `lucide-react`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `zustand`, `next`, `react`, `react-dom` | Tetap dipakai di seluruh aplikasi & devDependencies (`tailwindcss`, `@tailwindcss/turbopack`, `typescript`, `eslint`, `eslint-config-next`, `@types/*`). |

### 5.2 Active Frontend Source Files Map

| # | File Path | Lines | Wave | Target `@eta-ui/react` Primitives & Notes |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `frontend/src/app/globals.css` | 137 | 0 | `@import "@eta-ui/react/styles.layer.css"`, `@theme inline` `--color-eta-*`, temp legacy alias |
| 2 | `frontend/src/app/layout.tsx` | 37 | 0 | `ThemeScript`, `--eta-font-sans`, `bg-eta-base text-eta-body` |
| 3 | `frontend/src/components/providers.tsx` | 33 | 0 | `ThemeProvider`, `TooltipProvider`, `ToastProvider` |
| 4 | `frontend/src/lib/utils.ts` | 19 | 0 | `export { cn } from "@eta-ui/react"` |
| 5 | `frontend/src/components/shared/iso-date-picker.tsx` | *(new)* | 0 | Adapter `DatePicker` untuk string `"YYYY-MM-DD"` |
| 6 | `frontend/src/app/(auth)/login/page.tsx` | 116 | 1 | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`, `FormField`, `Input`, `Button`, `ThemeToggle`, `useToast` |
| 7 | `frontend/src/components/layout/dashboard-shell.tsx` | 20 | 1 | `SidebarProvider`, `SidebarInset` (tanpa `<main>` ganda), `<Suspense>` |
| 8 | `frontend/src/components/layout/sidebar-nav.tsx` | 133 | 1 | `Sidebar*` (`asChild`, tanpa `SidebarRail`, tanpa prop `tooltip`) |
| 9 | `frontend/src/components/layout/topbar.tsx` | 224 | 1 | `SidebarTrigger`, `Divider`, `Select`, `Popover`, `ThemeToggle`, `DropdownMenu` (`asChild`, `color="danger"`), `Avatar`, `Badge`, `IconButton`, `useToast` |
| 10 | `frontend/src/app/(dashboard)/page.tsx` | 304 | 2 | `Heading`, `Text`, `SegmentedControl`, `IsoDatePicker`, `StatGroup`, `Stat`, `Badge`, `Skeleton`, `BarChart`, `Card`, `CardBody`, `EmptyState`, `Divider` |
| 11 | `frontend/src/app/(dashboard)/categories/page.tsx` | 275 | 3 | `Tabs`, `Card`, `FormField`, `Input`, `Select`, `Switch`, `Button`, `Badge`, `Table`, `useToast` |
| 12 | `frontend/src/app/(dashboard)/products/page.tsx` | 196 | 3 | `Card`, `Input`, `Select`, `Button`, `IconButton`, `Badge`, `Table`, `Skeleton`, `EmptyState`, `useToast` |
| 13 | `frontend/src/app/(dashboard)/products/new/page.tsx` | 7 | 3 | Wrapper `<ProductForm />` (verifikasi bersih) |
| 14 | `frontend/src/app/(dashboard)/products/[id]/edit/page.tsx` | 55 | 3 | `Skeleton`, `Alert` untuk error state; pertahankan `<Suspense>` |
| 15 | `frontend/src/components/products/product-form.tsx` | 477 | 3 | `Card`, `CardBody`, `FormField`, `Input`, `Textarea`, `Select`, `Switch`, `Button`, `IconButton`, `useToast` |
| 16 | `frontend/src/app/(dashboard)/suppliers/page.tsx` | 259 | 3 | `Card`, `Input`, `Button`, `IconButton`, `Badge`, `Table`, `Dialog`, `AlertDialog`, `FormField`, `Switch`, `useToast` |
| 17 | `frontend/src/app/(dashboard)/customers/page.tsx` | 381 | 3 | `Card`, `Input`, `Select`, `Button`, `IconButton`, `Badge`, `Table`, `Dialog`, `FormField`, `Switch`, `useToast` |
| 18 | `frontend/src/app/(dashboard)/inventory/page.tsx` | 644 | 4 | `Tabs`, `Card`, `Table`, `Badge`, `Button`, `Dialog`, `Select`, `Input`, `FormField`, `Switch`, `Alert`, `useToast` |
| 19 | `frontend/src/app/(dashboard)/purchasing/page.tsx` | 450 | 4 | `Tabs`, `Card`, `Table`, `Badge`, `Button`, `Dialog`, `Select`, `Input`, `FormField`, `IsoDatePicker`, `useToast` |
| 20 | `frontend/src/app/(dashboard)/sales/page.tsx` | 432 | 5 | `Card`, `Input`, `Select`, `Table`, `Badge`, `Button`, `IconButton`, `Dialog`, `FormField`, `Divider`, `useToast` |
| 21 | `frontend/src/app/(dashboard)/cash-management/page.tsx` | 395 | 5 | `StatGroup`, `Stat`, `Card`, `Badge`, `Button`, `Input`, `Select`, `FormField`, `Table`, `Alert`, `useToast` |
| 22 | `frontend/src/app/(dashboard)/expenses/page.tsx` | 358 | 5 | `Card`, `Select`, `Input`, `IsoDatePicker`, `Checkbox`, `Button`, `Badge`, `Table`, `FormField`, `useToast` |
| 23 | `frontend/src/app/(dashboard)/reports/page.tsx` | 365 | 5 | `Tabs`, `Card`, `IsoDatePicker`, `Select`, `Input`, `Checkbox`, `Button`, `Badge`, `Table`, `FormField`, `useToast` |
| 24 | `frontend/src/app/(dashboard)/users/page.tsx` | 368 | 6 | `Card`, `Input`, `Button`, `IconButton`, `Badge`, `Table`, `Dialog`, `Checkbox`, `FormField`, `useToast` |
| 25 | `frontend/src/app/(dashboard)/roles/page.tsx` | 146 | 6 | `Card`, `Badge`, `Button`, `Dialog`, `Checkbox`, `useToast` |
| 26 | `frontend/src/app/(dashboard)/settings/page.tsx` | 229 | 6 | `Card`, `Input`, `Button`, `IconButton`, `Badge`, `Switch`, `Dialog`, `FormField`, `useToast` |
| 27 | `frontend/src/app/(pos)/pos/page.tsx` (+ 3 komponen modular `src/components/pos/*`) | 1894 | 7 | Redesign penuh POS Terminal + extract `pos-customer-drawer.tsx`, `pos-held-drawer.tsx`, `pos-receipt-dialog.tsx` |

### 5.3 Legacy Files to Delete in Wave 8 (27 Files Total)

- `frontend/components.json`
- `frontend/src/hooks/use-mobile.ts`
- Seluruh 25 file di `frontend/src/components/ui/`:
  `alert-dialog.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `chart.tsx`, `checkbox.tsx`, `date-picker.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `popover.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `tooltip.tsx`.

---

## 6. Wave-by-Wave Execution Plan

### Wave 0 — Package Install, Theme Tokens & Foundation Layer

**Goal**: Memasang `@eta-ui/react`, mengonfigurasi Tailwind v4 Cascade Layers + token `--eta-*`, SSR anti-flicker `ThemeScript`, root `Providers`, `cn`, dan adapter `IsoDatePicker`.

**Files**: `frontend/package.json`, `frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`, `frontend/src/components/providers.tsx`, `frontend/src/lib/utils.ts`, `frontend/src/components/shared/iso-date-picker.tsx`

- [ ] **0.1** Install `@eta-ui/react`:
  ```bash
  cd frontend && npm install @eta-ui/react@^0.5.0
  ```
- [ ] **0.2** Perbarui `frontend/src/app/globals.css` menggunakan **Template 3.1** (termasuk blok sementara `TEMPORARY LEGACY SHADCN ALIASES`).
- [ ] **0.3** Perbarui `frontend/src/app/layout.tsx` menggunakan **Template 3.2** (`--eta-font-sans` dan `<ThemeScript defaultTheme="system" />` di `<head>`).
- [ ] **0.4** Perbarui `frontend/src/components/providers.tsx` menggunakan **Template 3.3** (`ThemeProvider`, `TooltipProvider`, `ToastProvider`).
- [ ] **0.5** Perbarui `frontend/src/lib/utils.ts` menggunakan **Template 3.4** (`export { cn } from "@eta-ui/react"`).
- [ ] **0.6** Buat `frontend/src/components/shared/iso-date-picker.tsx` menggunakan **Template 3.5**.

**Wave 0 Gate Check**:
```bash
cd frontend && npx tsc --noEmit && npm run lint
```

---

### Wave 1 — Authentication & Backoffice Layout Shell

**Goal**: Memigrasikan halaman Login dan kerangka layout Backoffice (`DashboardShell`, `SidebarNav`, `Topbar`) sehingga seluruh navigasi, switcher toko, notifikasi, dan theme toggle berjalan native di `@eta-ui/react`.

**Files**: `frontend/src/app/(auth)/login/page.tsx`, `frontend/src/components/layout/dashboard-shell.tsx`, `frontend/src/components/layout/sidebar-nav.tsx`, `frontend/src/components/layout/topbar.tsx`

- [ ] **1.1** `frontend/src/app/(auth)/login/page.tsx`:
  - Ganti import `@/components/ui/*` dan `sonner` dengan `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`, `FormField`, `Input`, `Button`, `ThemeToggle`, `useToast` dari `@eta-ui/react`.
  - Pertahankan `react-hook-form` + `zodResolver(loginSchema)` dan `apiFetch("/auth/login")`.
  - Tambahkan `<ThemeToggle variant="icon" size="sm" />` di pojok kanan atas halaman login.
  - Gunakan `isLoading={submitting}` pada `<Button type="submit" variant="solid" color="primary" className="w-full">`.
  - Gunakan `isInvalid={Boolean(errors.email)}` dan `errorMessage={errors.email?.message}` pada `FormField`.
- [ ] **1.2** `frontend/src/components/layout/dashboard-shell.tsx`:
  - Import `SidebarInset`, `SidebarProvider` dari `@eta-ui/react`.
  - Pertahankan `<Suspense fallback={<div className="w-64 shrink-0 border-r border-eta-border bg-eta-surface" />}><SidebarNav /></Suspense>`.
  - **PENTING**: `SidebarInset` dari `@eta-ui/react` sudah merender tag `<main>`, jadi ubah `<main className="flex-1 p-4 lg:p-6">` menjadi `<div className="flex-1 p-4 lg:p-6">{children}</div>`.
- [ ] **1.3** `frontend/src/components/layout/sidebar-nav.tsx`:
  - Import `Sidebar*` dan `useSidebar` dari `@eta-ui/react`.
  - Hapus `<SidebarRail />` (tidak ada di `@eta-ui/react`).
  - Ganti `render={<Link href="..." />}` dengan `asChild` (`<SidebarMenuButton asChild size="lg"><Link href="/">...</Link></SidebarMenuButton>`).
  - Hapus prop `tooltip={item.label}` dari `SidebarMenuButton` dan ganti dengan `title={item.label}` (atau bungkus `<Tooltip content={item.label} side="right">` saat `state === "collapsed"`).
  - Ganti kelas warna lama di `SidebarHeader`/`SidebarFooter` ke `border-eta-border`, `bg-eta-primary text-eta-inverse`, `text-eta-muted`, `text-eta-heading`.
- [ ] **1.4** `frontend/src/components/layout/topbar.tsx`:
  - Hapus `next-themes` (`useTheme`), `sonner`, dan seluruh import `@/components/ui/*`.
  - Gunakan `Avatar` (`<Avatar name={user.name} size="sm" />`, tanpa `AvatarFallback`), `Badge` (`variant="soft" color="neutral"`), `Button`, `IconButton`, `DropdownMenu*` (`asChild` untuk `<Link href="/settings">`, `color="danger"` untuk Logout), `Popover*` (`PopoverHeader`, `PopoverTitle`, `PopoverBody`), `Select*` (store switcher), `Divider` (`orientation="vertical"`), `SidebarTrigger`, `ThemeToggle` (`variant="icon" size="sm"`), dan `useToast`.
  - Ganti `<Button variant="ghost" size="icon">` notifikasi dengan `<IconButton icon={<Bell className="h-4 w-4" />} variant="ghost" size="sm" aria-label="Notifications" />` atau `<Button variant="ghost" size="sm" ...>` jika memiliki badge hitungan unread di dalamnya.

**Wave 1 Gate Check**:
```bash
cd frontend && npx tsc --noEmit && npm run lint
```

---

### Wave 2 — Analytics Dashboard Home

**Goal**: Meredesain halaman utama Dashboard (`/`) dan menghapus ketergantungan terakhir pada `recharts` di Dashboard.

**File**: `frontend/src/app/(dashboard)/page.tsx`

- [ ] **2.1** Hapus import `recharts` (`Bar, BarChart, CartesianGrid, XAxis, YAxis`), `@/components/ui/chart`, `@/components/ui/card`, `@/components/ui/badge`, `@/components/ui/button`, dan `@/components/ui/date-picker`.
- [ ] **2.2** Gunakan `Heading`, `Text` untuk header halaman; `SegmentedControl` + `SegmentedControlItem` untuk switcher role (`owner`, `manager`, `cashier`); dan `IsoDatePicker` (`size="sm"`) untuk `dateFrom` dan `dateTo`.
- [ ] **2.3** Ganti seluruh KPI card dengan `<StatGroup>` dan `<Stat variant="surface" label={...} value={...} helpText={...} icon={...} />` (dan `<Badge variant="soft" color={...}>` untuk status Cash Register).
- [ ] **2.4** Ganti loading placeholders dengan `<Skeleton variant="rounded" height={112} />`.
- [ ] **2.5** Ganti `<ChartContainer>` + Recharts `<BarChart>` dengan `@eta-ui/react` `<BarChart>`:
  ```tsx
  <BarChart
    title="Daily Revenue Trend"
    description={data?.period ? `${data.period.from} to ${data.period.to}` : "Last 30 days"}
    data={chartData}
    indexKey="date"
    series={[{ key: "revenue", label: "Revenue", color: "primary" }]}
    height={260}
    valueFormatter={(val) => formatCurrency(val)}
    isLoading={dashboardQuery.isLoading}
    emptyState={
      <EmptyState
        size="sm"
        title="No sales data"
        description="No sales data for the selected period."
      />
    }
  />
  ```
- [ ] **2.6** Migrasikan card "Top Products" ke `Card`, `CardHeader`, `CardTitle`, `CardBody`, `EmptyState`, dan `Divider`.

**Wave 2 Gate Check**:
```bash
cd frontend && npx tsc --noEmit && npm run lint
```

---

### Wave 3 — Master Data & Catalog

**Goal**: Memigrasikan seluruh modul Master Data (Categories, Brands, Units, Taxes, Warehouses, Products, Product Form, Suppliers, Customers).

**Files**: `frontend/src/app/(dashboard)/categories/page.tsx`, `frontend/src/app/(dashboard)/products/page.tsx`, `frontend/src/app/(dashboard)/products/new/page.tsx`, `frontend/src/app/(dashboard)/products/[id]/edit/page.tsx`, `frontend/src/components/products/product-form.tsx`, `frontend/src/app/(dashboard)/suppliers/page.tsx`, `frontend/src/app/(dashboard)/customers/page.tsx`

- [ ] **3.1** `frontend/src/app/(dashboard)/categories/page.tsx`:
  - Migrasikan ke `Tabs` (`variant="underline"`), `Card`/`CardBody`, `FormField`, `Input`, `Select`, `Switch`, `Button`, `Badge`, `Table`, `EmptyState`, `useToast`.
- [ ] **3.2** `frontend/src/app/(dashboard)/products/page.tsx`:
  - Migrasikan ke `Card` (`padding="none"` untuk tabel), `Input` (`leftAdornment={<Search className="h-4 w-4" />}`), `Select`, `Button`, `IconButton`, `Badge`, `Table*`, `Skeleton`, `EmptyState`, `AlertDialog` (untuk konfirmasi delete produk agar lebih aman), `useToast`.
  - Ganti `<Link href="/products/new"><Button>...</Button></Link>` atau `<Button asChild><Link href="/products/new">...</Link></Button>`.
- [ ] **3.3** `frontend/src/components/products/product-form.tsx`:
  - Migrasikan ke `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`, `FormField`, `Input`, `Textarea`, `Select`, `Switch`, `Button`, `IconButton`, `useToast`.
  - Pastikan semua `Select` optional (`categoryId`, `brandId`, `taxId`) tetap memakai `"none"` (bukan `""`).
- [ ] **3.4** `frontend/src/app/(dashboard)/products/[id]/edit/page.tsx` & `products/new/page.tsx`:
  - Di `[id]/edit/page.tsx`, ganti skeleton loading dengan `<Skeleton>` dan error state dengan `<Alert status="error">`. Pertahankan `<Suspense>` wrapper.
  - Verifikasi `products/new/page.tsx` tetap bersih.
- [ ] **3.5** `frontend/src/app/(dashboard)/suppliers/page.tsx`:
  - Migrasikan ke `Card`, `Input`, `Button`, `IconButton`, `Badge`, `Table*`, `Dialog*`, `FormField`, `Switch`, `EmptyState`, `useToast`.
- [ ] **3.6** `frontend/src/app/(dashboard)/customers/page.tsx`:
  - Migrasikan ke `Card`, `Input`, `Select`, `Button`, `IconButton`, `Badge`, `Table*`, `Dialog*` (Create/Edit + Loyalty Points modal), `FormField`, `Switch`, `EmptyState`, `useToast`.

**Wave 3 Gate Check**:
```bash
cd frontend && npx tsc --noEmit && npm run lint
```

---

### Wave 4 — Inventory & Purchasing

**Goal**: Memigrasikan halaman kompleks multi-tab Inventory (Stock Overview, Movements, Adjustments, Transfers, Expired Alerts, Reconciliation) dan Purchasing (PO, GRN, Invoices, Returns).

**Files**: `frontend/src/app/(dashboard)/inventory/page.tsx`, `frontend/src/app/(dashboard)/purchasing/page.tsx`

- [ ] **4.1** `frontend/src/app/(dashboard)/inventory/page.tsx`:
  - Migrasikan seluruh 10 import `@/components/ui/*` + `sonner` ke `@eta-ui/react`: `Tabs` (`variant="underline"`), `Card`/`CardBody`, `Table*`, `Badge`, `Button`, `Dialog*` (Adjustment & Transfer modals), `Select*`, `Input`, `FormField`, `Switch`, `Alert`, `EmptyState`, `useToast`.
  - Periksa semua modal item dinamis (adjustment lines & transfer lines) memastikan tombol hapus baris memakai `IconButton` atau `Button variant="soft" color="danger" size="sm"`.
- [ ] **4.2** `frontend/src/app/(dashboard)/purchasing/page.tsx`:
  - Migrasikan ke `@eta-ui/react`: `Tabs`, `Card`/`CardBody`, `Table*`, `Badge`, `Button`, `Dialog*`, `Select*`, `Input`, `FormField`, `IsoDatePicker` (menggantikan `DatePicker` lama untuk `orderDate` / `expectedDate`), `EmptyState`, `useToast`.

**Wave 4 Gate Check**:
```bash
cd frontend && npx tsc --noEmit && npm run lint
```

---

### Wave 5 — Commerce & Finance

**Goal**: Memigrasikan Sales (+ Refund & Receipt Modal), Cash Management, Expenses (+ Attachment & DatePicker), dan Reports (+ Promotions & Async Export).

**Files**: `frontend/src/app/(dashboard)/sales/page.tsx`, `frontend/src/app/(dashboard)/cash-management/page.tsx`, `frontend/src/app/(dashboard)/expenses/page.tsx`, `frontend/src/app/(dashboard)/reports/page.tsx`

- [ ] **5.1** `frontend/src/app/(dashboard)/sales/page.tsx`:
  - Migrasikan ke `Card`/`CardBody`, `Input`, `Select*`, `Table*`, `Badge`, `Button`, `IconButton`, `Dialog*` (Thermal Receipt dialog & Return/Refund dialog), `FormField`, `SegmentedControl` (58mm/80mm paper toggle), `Divider`, `EmptyState`, `useToast`.
- [ ] **5.2** `frontend/src/app/(dashboard)/cash-management/page.tsx`:
  - Migrasikan ringkasan sesi kasir aktif ke `StatGroup`/`Stat`, `Card`/`CardBody`, `Badge`, `Button`, `Input`, `Select*`, `FormField`, `Table*`, `Alert` (`status="warning"` / `status="info"`), `useToast`.
- [ ] **5.3** `frontend/src/app/(dashboard)/expenses/page.tsx`:
  - Migrasikan ke `Card`/`CardBody`, `Select*`, `Input`, `IsoDatePicker`, `Checkbox` (`label=...`, bungkus `Boolean(v)` pada `onCheckedChange`), `Button`, `Badge`, `Table*`, `FormField`, `useToast`.
- [ ] **5.4** `frontend/src/app/(dashboard)/reports/page.tsx`:
  - Migrasikan ke `Tabs`, `Card`/`CardBody`, `IsoDatePicker`, `Select*`, `Input`, `Checkbox` (bungkus `Boolean(v)`), `Button`, `Badge`, `Table*`, `FormField`, `EmptyState`, `useToast`.

**Wave 5 Gate Check**:
```bash
cd frontend && npx tsc --noEmit && npm run lint
```

---

### Wave 6 — IAM & System Settings

**Goal**: Memigrasikan manajemen User, Role & Permissions matrix, dan Settings (Store & System Preferences).

**Files**: `frontend/src/app/(dashboard)/users/page.tsx`, `frontend/src/app/(dashboard)/roles/page.tsx`, `frontend/src/app/(dashboard)/settings/page.tsx`

- [ ] **6.1** `frontend/src/app/(dashboard)/users/page.tsx`:
  - Migrasikan ke `Card`/`CardBody`, `Input`, `Button`, `IconButton`, `Badge`, `Table*`, `Dialog*` (Create/Edit + Reset Password), `Checkbox` (role & store assignments, bungkus `Boolean(v)`), `FormField`, `EmptyState`, `useToast`.
- [ ] **6.2** `frontend/src/app/(dashboard)/roles/page.tsx`:
  - Migrasikan ke `Card`/`CardBody`, `Badge` (`variant="soft" color="primary"` / `"neutral"`), `Button`, `Dialog*`, `Checkbox` (permission checklist, bungkus `Boolean(v)`), `useToast`.
- [ ] **6.3** `frontend/src/app/(dashboard)/settings/page.tsx`:
  - Migrasikan ke `Card`/`CardBody`, `Input`, `Button`, `IconButton`, `Badge`, `Switch`, `Dialog*`, `FormField`, `useToast`.

**Wave 6 Gate Check**:
```bash
cd frontend && npx tsc --noEmit && npm run lint
```

---

### Wave 7 — Fullscreen POS Terminal Redesign (`/pos`)

**Goal**: Meredesain terminal kasir `(pos)/pos/page.tsx` dengan `@eta-ui/react` sekaligus memecah 3 overlay modal/drawer menjadi sub-komponen modular di `frontend/src/components/pos/` agar file utama lebih ringkas dan mudah dirawat.

**Files**:
- *(New)* `frontend/src/components/pos/pos-customer-drawer.tsx`
- *(New)* `frontend/src/components/pos/pos-held-drawer.tsx`
- *(New)* `frontend/src/components/pos/pos-receipt-dialog.tsx`
- *(Modify)* `frontend/src/app/(pos)/pos/page.tsx`

- [ ] **7.1** Buat `frontend/src/components/pos/pos-customer-drawer.tsx`:
  - Gunakan `Drawer` / `Sheet` (`side="right"`), `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetBody`, `SheetFooter`, `Input`, `SegmentedControl` (segment `all` / `member` / `registered` / `wholesale`), `Avatar`, `Badge`, `Button`, `FormField`, `Select` (quick-add customer type), `Kbd`.
  - Pertahankan seluruh state & mutasi `createCustomerMutation` dan filter customer.
- [ ] **7.2** Buat `frontend/src/components/pos/pos-held-drawer.tsx`:
  - Gunakan `Sheet` (`side="right"`), `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetBody`, `Button`, `EmptyState`, `Alert`, `Skeleton`.
- [ ] **7.3** Buat `frontend/src/components/pos/pos-receipt-dialog.tsx`:
  - Gunakan `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter`, `Alert` (`status="success"` menampilkan `Kembalian`), `SegmentedControl` (`58mm` / `80mm`), `Button`, dan `printThermalReceipt`.
- [ ] **7.4** Redesign `frontend/src/app/(pos)/pos/page.tsx`:
  - **Top Header Bar**:
    - Backoffice button: `<Button asChild variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}><Link href="/">Backoffice</Link></Button>`
    - Store & Cashier info: `Avatar` / badge store, `Clock` live time.
    - Quick Barcode Input: `<Input ref={barcodeInputRef} leftAdornment={<ScanBarcode />} rightAdornment={<Kbd size="sm">F2</Kbd>} ... />`
    - Right Actions: `<ThemeToggle variant="icon" size="sm" />` + Held Orders `<Button variant="ghost" size="sm">` dengan `<Badge color={heldCount > 0 ? "warning" : "neutral"}>{heldCount}</Badge>`.
  - **Unauthenticated Gate**:
    - `<Card variant="elevated">` dengan `Button asChild` ke `/login` dan `/`.
  - **Left Pane (Product Catalogue)**:
    - Toolbar search (`<Input ref={searchInputRef} leftAdornment={<Search />} rightAdornment={...} />`) + Category filter pills (`Button` `variant={isActive ? "solid" : "outline"}` `size="sm"` dengan `Badge`).
    - Grid produk: gunakan `Card` (`isInteractive`, `padding="sm"`), `AspectRatio` (`ratio={4 / 3}`), `Badge` untuk SKU & `×{inCartQty}` di keranjang, `Skeleton` untuk loading, `Alert` untuk error + retry, `EmptyState` untuk hasil kosong.
  - **Right Pane (Active Order Ticket & Checkout)**:
    - Header & Customer bar (`Avatar`, `Badge`, `IconButton` edit & clear cart).
    - Item list dengan kontrol `- / qty / +` (`IconButton`) dan hapus item.
    - Billing summary card (`Card variant="filled" padding="sm"` + `Divider`) dengan input diskon keranjang, daftar metode pembayaran (`Button`), quick-cash chips (`Uang Pas`, `50.000`, `100.000`, `200.000`), input nominal diterima (`Input`), indikator kurang/kembalian (`text-eta-danger` / `text-eta-success`), tombol Hold (`IconButton` / `Button`) dan tombol utama **BAYAR SEKARANG** (`Button variant="solid" color="primary" size="lg" isLoading={processing}`).
  - **Mobile Sticky Bar & Bottom Shortcut Footer**:
    - Pertahankan mobile sticky button untuk membuka ticket panel (`ticketOpen`), dan gunakan `<Kbd size="sm">` untuk `F1`, `F2`, `F4`, `F8`.
  - **Toast Migration**:
    - Ganti `import { toast } from "sonner"` dengan `const { toast } = useToast();`.
  - **Verifikasi Shortcut**:
    - Pastikan handler `window.addEventListener("keydown", ...)` untuk `F1`/`Cmd+K`, `F2`, `F4`, `F8`, dan `Escape` bekerja identik dengan implementasi sebelumnya.

**Wave 7 Gate Check**:
```bash
cd frontend && npx tsc --noEmit && npm run lint
```

---

### Wave 8 — Legacy Cleanup, Dependency Uninstall, Full Verification & Documentation Sync

**Goal**: Menghapus seluruh kode dan dependensi UI lama setelah 100% file sudah memakai `@eta-ui/react`, memverifikasi production build, dan memperbarui dokumentasi tata kelola proyek.

- [ ] **8.1** **Zero-Reference Audit**: Pastikan tidak ada satu pun import tersisa ke package lama, `@/components/ui`, atau `@/hooks/use-mobile`:
  ```bash
  grep -rnE "@/components/ui|@/hooks/use-mobile|@base-ui/react|class-variance-authority|from ['\"]cn['\"]|date-fns|next-themes|react-day-picker|recharts|shadcn|sonner|tw-animate-css" frontend/src
  ```
  **Syarat Lanjut**: Perintah di atas **WAJIB mengembalikan 0 baris** (exit code 1 / empty output). Jika masih ada hasil, perbaiki file tersebut terlebih dahulu!
- [ ] **8.2** Hapus blok `/* TEMPORARY LEGACY SHADCN ALIASES — REMOVE IN WAVE 8 */` beserta semua variabel `--color-background`, `--color-card`, `--color-sidebar*`, dll. dari `frontend/src/app/globals.css`.
- [ ] **8.3** Hapus seluruh 27 file UI lama:
  ```bash
  rm -rf frontend/src/components/ui frontend/src/hooks/use-mobile.ts frontend/components.json
  ```
- [ ] **8.4** Uninstall seluruh 10 package UI yang sudah tidak terpakai:
  ```bash
  cd frontend && npm uninstall @base-ui/react class-variance-authority cn date-fns next-themes react-day-picker recharts shadcn sonner tw-animate-css
  ```
- [ ] **8.5** Jalankan verifikasi penuh frontend (Lint + Typecheck + Production Next.js Build):
  ```bash
  cd frontend && npm run lint && npx tsc --noEmit && npm run build
  ```
  **Syarat Lanjut**: Semua 3 perintah lulus dengan exit code 0 dan tanpa error.
- [ ] **8.6** Jalankan **Smoke Test Manual UI/UX** (10 Skenario Wajib):
  1. Reload `/login` dalam dark mode & light mode → tidak ada white/dark flash (`ThemeScript` bekerja).
  2. Login di `/login` dengan kredensial valid & invalid → `FormField` error dan `Toast` muncul normal.
  3. Navigasi Backoffice: collapse/expand sidebar desktop + buka mobile drawer + ganti store di Topbar `Select` + buka Popover notifikasi + klik `ThemeToggle`.
  4. Buka Dashboard `/` → ganti role `Owner` / `Store Manager` / `Cashier`, filter tanggal via `IsoDatePicker`, pastikan `BarChart` & `Stat` tampil rapi di light dan dark mode.
  5. Master Data (`/categories`, `/products`, `/products/new`, `/products/[id]/edit`, `/suppliers`, `/customers`) → tes Create/Edit/Search/Select.
  6. Inventory (`/inventory`) & Purchasing (`/purchasing`) → tes seluruh tab, modal draft adjustment/transfer, dan PO `IsoDatePicker`.
  7. Sales (`/sales`), Cash Management (`/cash-management`), Expenses (`/expenses`), Reports (`/reports`) → tes filter status, upload attachment expense, refund dialog, dan export.
  8. IAM (`/users`, `/roles`, `/settings`) → tes checkbox permissions, user modal, dan store switch.
  9. POS Terminal (`/pos`) → tes shortcut `F1`/`Cmd+K`, `F2`, `F4`, `F8`, `Esc`; tambah item ke keranjang; ubah pelanggan via drawer; quick-add pelanggan; checkout tunai; verifikasi receipt modal `58mm`/`80mm` & tombol Cetak.
  10. POS Mobile viewport (`< 768px`) → verifikasi sticky bottom checkout bar dan overlay panel pesanan aktif tidak terpotong.
- [ ] **8.7** Perbarui Dokumentasi Tata Kelola sesuai `AGENTS.md`:
  - Buat `docs/adr/0004-eta-ui-design-system.md` mencatat migrasi dari `shadcn/ui` (`@base-ui/react`) ke `@eta-ui/react` (`--eta-*` CSS variables + Tailwind v4 Cascade Layers).
  - Perbarui `docs/PROJECT_OVERVIEW.md` (Section 3 Technology Stack: ganti `shadcn/ui` & `Recharts` menjadi `@eta-ui/react`).
  - Perbarui `docs/ARCHITECTURE.md` (Section 4 Frontend Architecture: ganti `components/ui/` dengan `components/shared/` & `components/pos/` + `@eta-ui/react`).
  - Perbarui `docs/CHANGELOG.md` dan `docs/PROGRESS_TRACKER.md`.
  - Pastikan seluruh dokumen yang diubah/dibuat memiliki pembaruan tabel `## Document Track Record`.
  - Perbarui status dokumen ini (`DOC-016`) menjadi `Completed` dan isi track record.

---

## 7. Troubleshooting & Pitfalls Quick Reference

| # | Error / Gejala | Penyebab | Solusi Tepat |
| :---: | :--- | :--- | :--- |
| 1 | `Module '"@eta-ui/react"' has no exported member 'CardContent'` | Memakai nama sub-komponen `shadcn/ui`. | Ganti `CardContent` menjadi **`CardBody`**. |
| 2 | `Module '"@eta-ui/react"' has no exported member 'Label'` | `Label` tidak diekspor; digantikan `FormField`/`FormLabel`. | Gunakan `<FormField label="...">` atau `<FormLabel htmlFor="...">`. |
| 3 | `Module '"@eta-ui/react"' has no exported member 'SidebarRail'` atau `Property 'tooltip' does not exist on SidebarMenuButton` | Perbedaan API `Sidebar` antara `shadcn` dan `@eta-ui/react`. | Hapus `<SidebarRail />`; ganti `tooltip="..."` dengan `title="..."` atau `<Tooltip content="...">`. |
| 4 | Warning HTML hydration `cannot appear as a descendant of <main>` | `SidebarInset` sudah merender `<main>`. | Ubah wrapper anak di dalam `<SidebarInset>` dari `<main>` menjadi `<div>`. |
| 5 | Runtime error Radix: `A <Select.Item /> must have a value prop that is not an empty string` | Ada `<SelectItem value="">`. | Ganti `""` dengan `"all"` atau `"none"`, lalu sesuaikan state filter/form. |
| 6 | TypeScript error `Property 'render' does not exist` atau `nativeButton` error | Memakai API `@base-ui/react` pada komponen `@eta-ui/react` berbasis Radix. | Hapus `render={...}` & `nativeButton={false}`, gunakan prop **`asChild`** dengan child `<Link>` atau `<Button>`. |
| 7 | TypeScript error `Type 'boolean \| "indeterminate"' is not assignable to parameter of type 'boolean'` | `onCheckedChange` Radix `Checkbox` mengirim `CheckedState`. | Bungkus callback dengan `Boolean(checked)`: `onCheckedChange={(v) => setVal(Boolean(v))}`. |
| 8 | Tailwind class (`p-*`, `mt-*`, `bg-eta-*`) kalah spesifisitas oleh CSS komponen | Mengimpor `@eta-ui/react/styles.css` (unlayered) bukan `styles.layer.css`. | Pastikan `globals.css` mengimpor **`@import "@eta-ui/react/styles.layer.css";`**. |
| 9 | Error `useToast must be used within a ToastProvider` atau `toast` undefined | Memakai `import { toast } from "sonner"` atau lupa `ToastProvider`. | Pastikan `<ToastProvider>` ada di `providers.tsx` dan panggil `const { toast } = useToast();` di dalam komponen. |
| 10 | Build Next.js 16 gagal dengan error `Uncached data / dynamic API outside Suspense` | `cacheComponents: true` aktif dan komponen pemanggil `usePathname()`/`useParams()` tidak dibungkus `<Suspense>`. | Pertahankan `<Suspense>` di `DashboardShell` dan `products/[id]/edit/page.tsx`. |

---

## 8. Definition of Done (DoD) Checklist

Redesain UI dinyatakan **100% SELESAI** hanya apabila semua item berikut terpenuhi:

- [ ] Seluruh 27 file aktif di `frontend/src/` telah dimigrasikan ke `@eta-ui/react@0.5.0`.
- [ ] Folder `frontend/src/components/ui/`, `frontend/src/hooks/use-mobile.ts`, dan `frontend/components.json` telah dihapus.
- [ ] Seluruh 10 package UI lama (`@base-ui/react`, `class-variance-authority`, `cn`, `date-fns`, `next-themes`, `react-day-picker`, `recharts`, `shadcn`, `sonner`, `tw-animate-css`) telah di-uninstall dan tidak ada di `frontend/package.json`.
- [ ] `grep` audit di `frontend/src` menghasilkan 0 referensi ke package lama maupun `@/components/ui`.
- [ ] `cd frontend && npm run lint && npx tsc --noEmit && npm run build` lulus 100% dengan exit code 0.
- [ ] Seluruh 10 skenario Smoke Test Manual (termasuk POS keyboard shortcuts & dark/light mode) lulus tanpa regresi fungsional.
- [ ] Tidak ada perubahan di `backend/`.
- [ ] Dokumentasi tata kelola (`docs/adr/0004-eta-ui-design-system.md`, `PROJECT_OVERVIEW.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `PROGRESS_TRACKER.md`, dan `DOC-016`) telah diperbarui termasuk `Document Track Record`.

---

## 9. Appendix — Optional High-Saturation Theme Preset (Cobalt)

Jika di masa depan diinginkan warna aksen biru korporat (bukan **Sage** default), tambahkan blok berikut setelah `@import "@eta-ui/react/styles.layer.css";` di `frontend/src/app/globals.css`:

```css
/* Optional Cobalt High-Saturation Preset (WCAG 2.1 AA >= 4.5:1) */
:root {
  --eta-bg-base: #F8FAFC;
  --eta-bg-surface: #F1F5F9;
  --eta-bg-subtle: #E2E8F0;
  --eta-bg-hover: #CBD5E1;
  --eta-color-primary: #1D4ED8;
  --eta-color-primary-hover: #1E40AF;
  --eta-color-primary-subtle: rgba(29, 78, 216, 0.12);
  --eta-color-primary-focus: rgba(29, 78, 216, 0.28);
  --eta-color-secondary: #0369A1;
  --eta-color-secondary-hover: #075985;
  --eta-color-secondary-subtle: rgba(3, 105, 161, 0.12);
  --eta-text-heading: #0F172A;
  --eta-text-body: #334155;
  --eta-text-muted: #475569;
  --eta-text-inverse: #F8FAFC;
  --eta-border-default: #CBD5E1;
  --eta-border-focus: #1D4ED8;
}

[data-theme="dark"],
.dark {
  --eta-bg-base: #0B1120;
  --eta-bg-surface: #151F32;
  --eta-bg-subtle: #1E293B;
  --eta-bg-hover: #334155;
  --eta-color-primary: #60A5FA;
  --eta-color-primary-hover: #93C5FD;
  --eta-color-primary-subtle: rgba(96, 165, 250, 0.16);
  --eta-color-primary-focus: rgba(96, 165, 250, 0.35);
  --eta-color-secondary: #38BDF8;
  --eta-color-secondary-hover: #7DD3FC;
  --eta-color-secondary-subtle: rgba(56, 189, 248, 0.16);
  --eta-text-heading: #F8FAFC;
  --eta-text-body: #CBD5E1;
  --eta-text-muted: #94A3B8;
  --eta-text-inverse: #0B1120;
  --eta-border-default: #26354D;
  --eta-border-focus: #60A5FA;
}
```

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-26` | UI Redesign Planning | AI Frontend Architect | Created complete wave-by-wave UI redesign plan for migrating Dashboard & POS Terminal to `@eta-ui/react@0.5.0` and removing all unused UI dependencies (`@base-ui/react`, `shadcn`, `sonner`, `next-themes`, `recharts`, `react-day-picker`, `date-fns`, `class-variance-authority`, `cn`, `tw-animate-css`). |
| `1.1.0` | `2026-11-26` | UI Redesign Execution | AI Frontend Architect | Executed Waves 0–8: migrated 100% of Dashboard & POS UI to `@eta-ui/react@0.5.0`, deleted 27 legacy UI files, uninstalled 10 unused packages, verified `lint` / `tsc` / `build`, and synced governance docs (`ADR-0004`). |
