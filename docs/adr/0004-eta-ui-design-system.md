# ADR-0004: `@eta-ui/react` Design System & CSS-Variable Token Architecture

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `ADR-0004` |
| **Status** | `Accepted` |
| **Date** | `2026-11-26` |
| **Author** | Principal Frontend Architect (AI Agent) |

---

## Context
Sebelumnya, `frontend/` menggunakan `shadcn/ui` (`@base-ui/react`) dengan 25 file primitif lokal di `src/components/ui/`, ditambah beberapa library terpisah untuk tema (`next-themes`), toast (`sonner`), date picker (`react-day-picker` + `date-fns`), dan grafik (`recharts`). Hal ini menambah beban pemeliharaan komponen lokal, duplikasi CSS/JS, dan inkonsistensi token antar modul.

## Decision
1. **Standardize on `@eta-ui/react@^0.5.0`**: Seluruh UI Backoffice Dashboard dan Fullscreen POS Terminal menggunakan komponen dari `@eta-ui/react` (berbasis Radix UI primitives + CSS Modules zero-runtime + token `--eta-*` dengan kontras WCAG 2.1 AA).
2. **Tailwind CSS v4 Cascade Layers**: `frontend/src/app/globals.css` mengimpor `@eta-ui/react/styles.layer.css` dan memetakan token `--color-eta-*` pada `@theme inline` sehingga utility class Tailwind tetap dapat meng-override gaya komponen secara deterministik.
3. **SSR Anti-Flicker Theming**: `RootLayout` menyertakan `<ThemeScript defaultTheme="system" />` dan `Providers` menggunakan `ThemeProvider`, `TooltipProvider`, serta `ToastProvider` bawaan `@eta-ui/react`.
4. **Consolidate Dependencies**: Menghapus seluruh 25 file lokal `src/components/ui/`, `src/hooks/use-mobile.ts`, `components.json`, serta 10 package UI yang digantikan (`@base-ui/react`, `class-variance-authority`, `cn`, `date-fns`, `next-themes`, `react-day-picker`, `recharts`, `shadcn`, `sonner`, `tw-animate-css`).

## Consequences
- **Positif**: Ukuran dependensi jauh lebih ramping, desain seragam antara Dashboard & POS, light/dark/system mode tanpa flicker, dan komponen chart/datepicker/toast/sidebar terintegrasi dalam satu design system.
- **Negatif**: Ketergantungan pada API komponen `@eta-ui/react`; perubahan desain global di masa depan cukup dilakukan lewat override CSS custom properties `--eta-*` di `globals.css`.

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-26` | UI Redesign | AI Frontend Architect | Accepted decision to migrate all frontend UI from `shadcn/ui` (`@base-ui/react`) to `@eta-ui/react` and remove unused UI dependencies. |
