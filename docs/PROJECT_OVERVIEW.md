# Project Overview — Enterprise Point of Sales (POS)

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-001` |
| **Version** | `1.1.0` |
| **Status** | `Approved Baseline` |
| **Last Updated** | `2026-11-26` |
| **Author** | Principal Software Architect (AI Agent) |

---

## 1. Executive Summary

Enterprise Point of Sales (POS) adalah platform manajemen ritel dan transaksi penjualan berskala enterprise yang dirancang untuk operasional bisnis nyata: minimarket, retail modern, toko elektronik, pakaian, kosmetik, dan usaha perdagangan multi-cabang.

Sistem ini bukan sekadar aplikasi CRUD, melainkan platform transaksi yang menjamin **correctness of business logic**, **ACID data integrity**, **auditability penuh**, dan **kesiapan ekspansi menjadi ERP** tanpa melakukan *rewrite*.

## 2. Business Capabilities & Scope

Aplikasi mendukung penuh:
- **Single-store & Multi-store / Multi-outlet** dalam satu organisasi (dengan isolasi data per cabang).
- **Multi-warehouse** dengan pelacakan stok per gudang, batch/lot, tanggal kedaluwarsa, dan serial number.
- **Multi-user & Multi-role** dengan 10 role default dan izin (*permission*) granular per modul, fitur, dan aksi.
- **Multi-cashier & Cash Register Sessions** (buka/tutup kasir, cash in/out, rekonsiliasi selisih kas).
- **Multi-payment & Split Payment** (Tunai, Debit, Kredit, Transfer Bank, QRIS, E-Wallet, Store Credit, Customer Credit) dengan abstraksi payment gateway.
- **Purchasing End-to-End** (Purchase Order -> Goods Receipt -> Purchase Invoice -> Purchase Payment & Purchase Return).
- **Discount, Promotion & Tax Engine** (percentage, fixed, Buy X Get Y, bundle, coupon, time-based, tax inclusive/exclusive).
- **Financial Management, Reporting & Analytics** (dashboard per role, laporan penjualan/inventory/purchasing/keuangan, export Excel/CSV/PDF).

## 3. Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend** | Laravel 13 (PHP 8.5), Modular Monolith, RESTful API | Konsistensi ACID tinggi, ekosistem matang, isolasi domain jelas tanpa overhead microservices prematur. |
| **Auth & RBAC** | Laravel Sanctum + Spatie Laravel Permission | Native untuk Next.js SPA/POS terminal, granular permission & role management. |
| **API Docs** | Dedoc Scramble (OpenAPI 3.1) | Dokumentasi API selalu sinkron dengan FormRequest, Controller, dan API Resource. |
| **Frontend** | Next.js (App Router), TypeScript, Tailwind CSS v4, `@eta-ui/react` | UI enterprise modern berbasis Radix UI & CSS-variable `--eta-*` (WCAG 2.1 AA), terpisah antara layout Admin Backoffice dan POS Terminal berkecepatan tinggi. |
| **Frontend State** | TanStack Query, Zustand, React Hook Form, Zod | Pemisahan tegas antara server state, client state (cart/session), dan validasi form; chart, toast, theme, dan datepicker ditangani native oleh `@eta-ui/react`. |
| **Database** | MariaDB / MySQL (InnoDB) | Transaksi ACID, foreign key strict, row-level locking (`SELECT ... FOR UPDATE`), presisi `DECIMAL`. |
| **Cache & Queue** | Redis + Laravel Queue (+ Laravel Reverb opsional) | Rate limiting, idempotency locks, async reporting/export, dan notifikasi realtime. |

## 4. Target Users & Default Roles

1. **Super Admin** — Pengelola platform lintas organisasi/sistem.
2. **Owner** — Pemilik bisnis dengan visibilitas penuh lintas outlet dan laporan profitabilitas.
3. **Admin** — Administrator operasional perusahaan & master data.
4. **Store Manager** — Pengelola operasional outlet, approval lokal, dan performa kasir.
5. **Supervisor** — Otorisasi override harga/diskon, pembatalan, refund, dan tutup kasir.
6. **Cashier** — Pengoperasian terminal POS dan sesi register kasir.
7. **Inventory Staff** — Pengelolaan stok, opname, adjustment, dan transfer antar gudang.
8. **Purchasing Staff** — Pengelolaan supplier, PO, penerimaan barang, dan faktur pembelian.
9. **Finance Staff** — Rekonsiliasi kas, pembayaran supplier, pencatatan biaya, dan laporan keuangan.
10. **Auditor** — Akses *read-only* terhadap transaksi, stok ledger, dan audit log.

## 5. Success Criteria & Quality Priorities

Prioritas rekayasa secara berurutan:
1. Correctness of business logic.
2. Data integrity & concurrency safety.
3. Security & multi-store data isolation.
4. Maintainability & modular boundary discipline.
5. Scalability & query performance.
6. Responsive & low-click cashier UX.

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Architect | Initial creation of Project Overview based on approved monorepo fresh-install baseline (`backend/` Laravel 13 + `frontend/` Next.js). |
| `1.1.0` | `2026-11-26` | UI Redesign | AI Frontend Architect | Updated Frontend stack to `@eta-ui/react` design system (replacing `shadcn/ui`, `recharts`, `sonner`, `next-themes`). |
