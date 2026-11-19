# Enterprise POS — Feature Checklist

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-012` |
| **Version** | `1.0.0` |
| **Status** | `Active` |
| **Last Updated** | `2026-11-19` |
| **Author** | Principal Software Architect (AI Agent) |

Legend: `[ ]` Not Started | `[/]` In Progress | `[x]` Done & Verified

---

## Phase 0 — Architecture & Setup
- [x] Clean monorepo fresh install (`backend/` Laravel 13 + `frontend/` Next.js)
- [x] Complete architectural & technical documentation (`docs/*.md` + ADRs)

## Phase 1 — Foundation
- [x] Modular monolith infrastructure (`app/Modules/*`, `ApiResponse`, `Idempotency`, `EnsureStoreAccess`)
- [x] Authentication (Laravel Sanctum: login, logout, refresh, me)
- [x] Authorization (Spatie Permission: 10 default roles + granular permissions)
- [x] Organization & Store management (code, timezone, operating hours, tax config)
- [x] User management (CRUD, activate/deactivate, reset password, role/store/warehouse assignment)
- [x] Audit Log foundation (append-only event logger)
- [x] System Settings module
- [x] Frontend base UI (Auth, Sidebar Navigation, Dark/Light Mode, Store Switcher)

## Phase 2 — Master Data
- [x] Categories (hierarchical), Brands, Units of Measurement (+ conversions)
- [x] Tax Management (inclusive/exclusive, product & store specific)
- [x] Warehouse Management (per store & central)
- [x] Product Management (standard, variant, bundle, service, non-stock)
- [x] Barcode Management (generate, scan, multiple barcodes, label print)
- [x] Product Pricing (purchase, selling, wholesale, min price, store-specific, price history)
- [x] Supplier Management (CRUD, payment terms, balance, history)
- [x] Customer Management (walk-in, registered, member, wholesale, credit limit, loyalty)

## Phase 3 — Inventory Management
- [x] Stock overview per outlet/warehouse/product
- [x] Immutable `stock_movements` ledger + `SELECT ... FOR UPDATE` locking
- [x] Stock Adjustment (with approval & reason)
- [x] Stock Transfer (in-transit + receiving)
- [x] Stock Opname & Stock Reconciliation
- [x] Batch/Lot, Expired Date, Serial Number tracking, Min/Max/Reorder alerts

## Phase 4 — Purchasing Management
- [x] Purchase Order (multi-item, discount, tax, approval workflow)
- [x] Goods Receipt (partial/full receiving, damaged items -> stock in + MAC update)
- [x] Purchase Invoice (due date, payment status)
- [x] Purchase Payment (partial/full, cash/transfer, outstanding balance)
- [x] Purchase Return (reason, stock out, credit note)

## Phase 5 — Point of Sales (Core)
- [ ] Fast POS UI (keyboard shortcuts, barcode scanner, category nav, product grid, cart)
- [ ] Cart operations (add/remove/qty, permissioned price override, item/cart discount, hold/resume)
- [ ] Idempotent atomic checkout (server-side calculation, stock deduction, payment, audit log)
- [ ] Multi-payment & Split payment + Payment Gateway abstraction
- [ ] Receipt generation (Thermal 58mm, Thermal 80mm, PDF, reprint)
- [ ] Sales Management (list, detail, history, authorized cancellation/void)

## Phase 6 — Financial Management
- [ ] Cash Register Session (open, cash in/out, close, expected vs actual reconciliation)
- [ ] Sales Return, Refund (partial/full) & Exchange with reference to original sale
- [ ] Expense Management (categories, attachments, approval workflow)

## Phase 7 — Advanced Features
- [ ] Promotion & Discount Engine (%, fixed, BOGO, Buy X Get Y, bundle, coupon, time-based, stacking/priority)
- [ ] Loyalty Points & Member Discounts
- [ ] Notification System (DB, Email, optional Reverb realtime)
- [ ] Role-based Dashboards (Owner, Store Manager, Cashier) with date/store/cashier/category filters
- [ ] Full Reporting (Sales, Inventory, Purchasing, Financial) + Async Export (Excel, CSV, PDF)

## Phase 8 — Quality & Production
- [ ] All 10 Critical Scenarios automated tests passing
- [ ] Security audit, query optimization, OpenAPI verification, deployment & backup runbook

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Architect | Initial master feature checklist across all 8 phases; Phase 0 marked complete. |
| `1.1.0` | `2026-11-19` | Phase 1 | AI Architect | Marked all Phase 1 — Foundation deliverables complete after passing backend & frontend verification. |
| `1.2.0` | `2026-11-19` | Phase 2 | AI Architect | Marked all Phase 2 — Master Data deliverables complete (8 backend modules + frontend catalog/partner pages + tests). |
| `1.3.0` | `2026-11-19` | Phase 3 | AI Architect | Marked all Phase 3 — Inventory Management deliverables complete (Inventory ledger, locking, MAC, opname, adjustment, transfer, CS-01 & CS-07 tests, frontend `/inventory`). |
| `1.4.0` | `2026-11-19` | Phase 4 | AI Architect | Marked all Phase 4 — Purchasing Management deliverables complete (PO, GRN, Invoices, Payments, Returns + Credit Note + Frontend `/purchasing`). |
