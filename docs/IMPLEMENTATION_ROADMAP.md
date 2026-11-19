# Implementation Roadmap (8 Phases)

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-010` |
| **Version** | `1.0.0` |
| **Status** | `Active` |
| **Last Updated** | `2026-11-19` |
| **Author** | Principal Software Architect (AI Agent) |

---

## Phase 0 — Architecture, Fresh Install & Documentation (`Completed`)
- Clean workspace reset & monorepo setup (`backend/` Laravel 13 + `frontend/` Next.js + `docs/`).
- Complete documentation suite (`docs/*.md`, ERD, DB Design, Business Rules, API Spec, ADRs, Trackers).

## Phase 1 — Foundation (`Next`)
- Backend packages: Sanctum, Spatie Permission, Dedoc Scramble, Pest, Larastan (Level 7).
- MariaDB/MySQL & Redis configuration, modular monolith bootstrapper (`app/Modules/*`), standard `ApiResponse`, `Idempotency` middleware, `EnsureStoreAccess` middleware.
- Modules: `Core`, `IAM` (10 default roles + granular permissions + Users CRUD), `Organization`, `Store`, `AuditLog`, `Settings`.
- Frontend packages: shadcn/ui, TanStack Query, Zustand, React Hook Form, Zod, TanStack Table, Recharts.
- Frontend base layout: Auth (Login, Store Switcher), Backoffice Sidebar, Dark/Light mode, Toast & Error handling.

## Phase 2 — Master Data
- Modules: `Category`, `Brand`, `Unit` (+ conversions), `Tax`, `Warehouse`, `Supplier`, `Customer`, `Product` (standard, variant, bundle, service, non-stock, multi-barcode, store pricing, price history).
- Frontend CRUD & Data Tables untuk seluruh Master Data.

## Phase 3 — Inventory Management
- Modules: `Inventory` (ledger `stock_movements`, `SELECT ... FOR UPDATE`, batch/expiry, MAC valuation, reconciliation), `StockAdjustment`, `StockTransfer`, `StockOpname`.
- Inventory reports & low-stock / expired alerts.

## Phase 4 — Purchasing Management
- Module: `Purchasing` (Purchase Orders + approval, Goods Receipts partial/full/damaged -> stock in, Purchase Invoices, Purchase Payments, Purchase Returns).
- Frontend Purchasing workflows.

## Phase 5 — Point of Sales (Core Module)
- Modules: `POS`, `Sales`, `Payment` (single & split payment, payment gateway abstraction, idempotent checkout, hold/resume, void/cancellation).
- Dedicated fullscreen POS Terminal UI (keyboard shortcuts, barcode scanner focus, fast cart, change calculator, Thermal 58mm/80mm & PDF receipt).

## Phase 6 — Financial Management
- Modules: `CashManagement` (Cash Register open/close, cash in/out, expected vs actual reconciliation), `Expense` (categories, attachments, approval), `Sales` Return & Refund workflow.

## Phase 7 — Advanced Features
- Modules: `Promotion` (flexible promo engine + stacking/priority), Customer Loyalty Points, `Notification` (DB/Email/Reverb), `Analytics` (Owner/Manager/Cashier dashboards), `FinancialReporting` (full sales/inventory/purchasing/financial reports + async Excel/CSV/PDF exports).

## Phase 8 — Quality, Security & Production Readiness
- Security audit, query/index optimization, full verification of 10 Critical Scenarios, OpenAPI completeness check, Docker/deployment & backup runbook, monitoring & logging.

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Architect | Initial 8-phase implementation roadmap aligned with Enterprise POS specifications. |
