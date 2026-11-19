# Changelog

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-011` |
| **Version** | `0.1.0` |
| **Status** | `Active` |
| **Last Updated** | `2026-11-19` |
| **Author** | Engineering Team (AI Agent) |

All notable changes to this project will be documented in this file following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

---

## [Unreleased]

### Added
- **2026-11-19 (Phase 0)**:
  - Fresh monorepo initialization (`backend/` Laravel 13.43, `frontend/` Next.js App Router + TypeScript + Tailwind CSS, root `.gitignore`, fresh `git init -b main`).
  - Complete Phase 0 architectural documentation suite in `docs/` (`PROJECT_OVERVIEW`, `ARCHITECTURE`, `DATABASE_DESIGN`, `ERD`, `BUSINESS_RULES`, `API_DOCUMENTATION`, `SECURITY`, `DEVELOPMENT_GUIDE`, `TESTING_STRATEGY`, `IMPLEMENTATION_ROADMAP`, `FEATURE_CHECKLIST`, `PROGRESS_TRACKER`, `KNOWN_ISSUES_AND_FUTURE`, and `adr/0001`–`0003`).
  - Added mandatory **Document Track Record** to every documentation file.
  - Added root `AGENTS.md` enforcing strict compliance with `docs/` (SSOT), Document Track Record updates, modular monolith boundaries, and verification DoD.
  - Installed and configured **Laravel Boost** (`v2.10.4`) in `backend/` with guidelines, skills, and MCP configuration.
- **2026-11-19 (Phase 1 — Foundation)**:
  - Installed `laravel/sanctum`, `spatie/laravel-permission`, `dedoc/scramble`, and `larastan/larastan` (PHPStan Level 7) in `backend/`.
  - Implemented 6 foundation modules in `backend/app/Modules/`: `Core` (`Money` VO, `ApiResponse`, `AttachRequestId`, `EnsureStoreAccess`, `EnforceIdempotency`), `AuditLog`, `Organization`, `Store`, `IAM` (10 default roles + granular permissions, auth & user/role CRUD), and `Settings`.
  - Added automated unit & feature tests including **CS-06** multi-store isolation verification.
  - Installed frontend stack (`@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `@tanstack/react-table`, `recharts`, `lucide-react`, `sonner`, `next-themes`) and built Login, responsive Backoffice Shell (15-item Sidebar, Store Switcher, Dark/Light mode), Dashboard, Users, Roles & Permissions, and Settings pages.
  - Hardened backend against `laravel-best-practices` skill: enabled `Model::preventLazyLoading(! isProduction())`, eager-loaded `roles.permissions` + `permissions` + `stores`, added named `login` rate limiter (`email|ip`), added `Context::add()` propagation (`request_id`, `store_id`, `organization_id`), added deterministic `orderByDesc('id')` tie-breaker on `AuditLogController`, extracted `OrganizationPolicy`/`StorePolicy`/`UserPolicy` with `Gate::authorize()`, and standardized CRUD routes with `Route::apiResource()`.
- **2026-11-19 (Phase 2 — Master Data)**:
  - Implemented 8 backend domain modules in `backend/app/Modules/`: `Category` (hierarchical), `Brand`, `Unit` (+ `unit_conversions`), `Tax` (+ `TaxCalculator` inclusive/exclusive `bcmath`), `Warehouse` (store & central), `Supplier`, `Customer` (+ `customer_groups`, loyalty, credit limit), and `Product` (standard, variant, bundle, service, non-stock, multi-barcode + EAN-13 generator, store-specific period pricing via `PriceResolverService`, automatic `product_price_histories` & audit logs, and `products.view_cost` protection).
  - Updated `DatabaseSeeder` with default units (`PCS`, `BOX`, `PACK`, `KG`, `GR`, `L`, `M`), `PPN11`, default warehouse `WH-001`, and `CUST-WALKIN`.
  - Built frontend Master Data pages: `/categories` (Categories, Brands, Units, Taxes, Warehouses), `/products`, `/suppliers`, and `/customers`.
- **2026-11-19 (Phase 3 — Inventory Management)**:
  - Implemented `Inventory` (`stock_batches`, `inventory_stocks`, append-only `stock_movements`, `stock_opnames`), `InventoryLedgerService` (`SELECT ... FOR UPDATE`, anti-negative stock guard, MAC valuation, reservation/release, decimal-safe reconciliation), `StockAdjustment` (draft + approve workflow), and `StockTransfer` (draft → in_transit → received / cancelled with reversal).
  - Verified **CS-01** (last-stock guard) and **CS-07** (mid-transfer failure atomic rollback) via automated feature tests.
  - Built frontend `/inventory` page with Stock Overview, Movements Ledger, Adjustments, Transfers, Expired Alerts, and Ledger Reconciliation.
- **2026-11-19 (Phase 4 — Purchasing Management)**:
  - Implemented `Purchasing` module (`purchase_orders`, `goods_receipts`, `purchase_invoices`, `purchase_payments`, `purchase_returns`) with `bcmath` decimal totals, PO approval workflow, partial/full/damaged GRN posting good qty into `InventoryLedgerService` (with MAC update), supplier balance tracking, overpayment guard, and supplier credit notes on return.
  - Added end-to-end `PurchasingLifecycleTest` verifying PO → GRN → Invoice → Payment → Return → Inventory Reconciliation (0 discrepancies).
  - Built frontend `/purchasing` page with tabs for Purchase Orders, Goods Receipts, Invoices, and Returns.

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `0.1.0` | `2026-11-19` | Phase 0 | AI Agent | Initialized changelog with Phase 0 fresh install and documentation baseline. |
| `0.1.1` | `2026-11-19` | Phase 0 | AI Agent | Added root `AGENTS.md` documentation-compliance rules and Laravel Boost backend setup. |
| `0.2.0` | `2026-11-19` | Phase 1 | AI Agent | Recorded Phase 1 — Foundation completion (backend modules + frontend shell). |
| `0.2.1` | `2026-11-19` | Phase 1 | AI Agent | Logged `laravel-best-practices` hardening refinements (preventLazyLoading, Policies, Context, named login limiter, apiResource). |
| `0.3.0` | `2026-11-19` | Phase 2 | AI Agent | Recorded Phase 2 — Master Data completion (8 backend modules + 4 frontend pages + tests). |
| `0.4.0` | `2026-11-19` | Phase 3 | AI Agent | Recorded Phase 3 — Inventory Management completion (ledger, locking, MAC, adjustments, transfers, opname, CS-01/CS-07, frontend UI). |
| `0.5.0` | `2026-11-19` | Phase 4 | AI Agent | Recorded Phase 4 — Purchasing Management completion (PO, GRN, Invoices, Payments, Returns, tests, frontend UI). |
