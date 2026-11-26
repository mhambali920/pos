# Changelog

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-011` |
| **Version** | `1.1.0` |
| **Status** | `Release Ready` |
| **Last Updated** | `2026-11-26` |
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
- **2026-11-19 (Phase 5 — Point of Sales Core)**:
  - Implemented `Payment` (`payment_methods`, `PaymentGatewayContract`, `DefaultPaymentGateway`), `Sales` (`sales`, `sale_items` immutable snapshots, `payments`, `ReceiptService` 58mm/80mm thermal formatter, `VoidSaleAction`), and `POS` (`CreatePosTransactionAction`, `RecordPosPaymentAction`, `CompletePosCheckoutAction` with `idempotent` & `store.access` middleware).
  - Verified **CS-02** (idempotent checkout replay), **CS-03** (payment failure rollback), **CS-05** (split payment validation), **CS-09** (product soft-delete preserving sales), and **CS-10** (price change preserving historical snapshots) in `PosCheckoutCriticalScenariosTest`.
  - Built dedicated fullscreen POS Terminal (`/pos`) with auto-focused barcode input, keyboard shortcuts (`F2`/`Esc`), Zustand cart store, payment & exact cash controls, thermal receipt modal, and `/sales` history & void page.
- **2026-11-20 (Phase 6 — Financial Management)**:
  - Implemented `CashManagement` module (`cash_registers`, `cash_register_sessions`, append-only `cash_register_movements`, `CashReconciliationService` with `bcmath`, `OpenCashRegisterAction`, `RecordCashMovementAction`, `CloseCashRegisterAction`, and `AdjustClosedSessionAction` per BR-011/BR-012) and verified **CS-08** (`PENDING_TRANSACTIONS_EXIST`).
  - Implemented `Sales` Return, Refund & Exchange (`sale_returns`, `sale_return_items`, `CreateSaleReturnAction` with idempotency, resellable vs damaged stock return via `InventoryLedgerService`, and cash register refund deduction) and verified **CS-04** (`INVALID_REFUND_QUANTITY`).
  - Implemented `Expense` module (`expense_categories`, `expenses`, private `local` disk receipt attachments, approve/reject workflow, and automatic `cash_expense` movement on linked open cash register sessions).
  - Seeded default `CashRegister` (`REG-01`) and 5 `ExpenseCategory` records in `DatabaseSeeder`.
  - Built frontend `/cash-management`, `/expenses`, and `/sales` Return & Refund UI (with `FormData` upload support in `apiFetch`).
  - Hardened Phase 6 backend against `laravel-best-practices`: replaced client-extension upload handling with server-verified `$file->store(..., 'local')`, extracted `RefundSaleRequest` and `StoreExpenseRequest` with tenant/store-scoped `Rule::exists` & `Rule::unique`, enforced least-privilege view permissions on `CashRegisterController`, removed redundant `Schema::hasTable()` metadata queries from `CashReconciliationService`, and added deterministic `orderBy` tie-breakers + `Str::upper()`.
- **2026-11-20 (Phase 7 — Advanced Features)**:
  - Implemented `Promotion` module (`promotions`, `promotion_usages`, `PromotionEngineService` supporting percentage, fixed amount, BOGO, Buy X Get Y, bundle, coupon, time-based, priority & stackable evaluation).
  - Implemented Customer Loyalty Points ledger (`loyalty_point_transactions`, `LoyaltyService` auto-earning on POS checkout + atomic redemption/adjustment endpoints).
  - Implemented `Notification` module (`app_notifications`, `NotificationDispatcherService` for database + optional email channels, read/read-all endpoints).
  - Implemented `Analytics` module (`DashboardService` & `GET /api/v1/dashboard/{role}` for Owner, Store Manager, and Cashier with date/store/cashier/category filters).
  - Implemented `FinancialReporting` module (`ReportingService` for Sales, Inventory, Purchasing, and Financial P&L reports + `GenerateReportExportJob` async CSV/Excel/PDF exports with completion notification).
  - Upgraded frontend Dashboard (`/`) with Recharts & role switcher, added Topbar notification bell, and built `/reports` (Reports, Promotions, Async Exports).
- **2026-11-20 (Phase 8 — Quality & Production Readiness / v1.0.0)**:
  - Added `AttachSecurityHeaders` middleware (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) to all API responses.
  - Added named `api` (`120/min`) and `exports` (`10/min`) rate limiters in `AppServiceProvider` and throttled `POST /api/v1/reports/{type}/export`.
  - Updated Scramble OpenAPI 3.1 metadata (`v1.0.0`) and added `ProductionReadinessTest` verifying `/up`, security headers, authentication boundary, and `/docs/api.json` path completeness across all core modules.
  - Authored `docs/DEPLOYMENT_AND_RUNBOOK.md` covering zero-downtime deployment, Redis/queue/scheduler ops, MariaDB/MySQL automated backups, restore verification, and monitoring alerts.
- **2026-11-20 (Frontend shadcn/ui Migration & Full CRUD Completion)**:
  - Initialized official `shadcn/ui` CLI (`components.json`) and installed full component suite (`sidebar`, `dialog`, `alert-dialog`, `select`, `popover`, `calendar`, `date-picker`, `tabs`, `table`, `label`, `checkbox`, `switch`, `textarea`, `sheet`, `separator`, `tooltip`, `skeleton`, `dropdown-menu`, `scroll-area`).
  - Migrated `DashboardShell`, `SidebarNav`, and `Topbar` to official collapsible `shadcn/ui` `Sidebar` + `SidebarProvider` + `SidebarInset` + `Popover` notifications + `Select` store switcher.
  - Completed full Create/Edit/Delete & action workflows on `/products`, `/customers` (+ loyalty adjust), `/suppliers`, `/users` (+ activate/deactivate & reset password), `/roles` (+ permission sync), `/settings` (+ store CRUD & preferences), `/inventory` (+ adjustment & transfer drafts), and `/purchasing` (+ PO creation with `DatePicker`).
  - Replaced all native `<input type="date">` and `<select>` across dashboard pages with shadcn `DatePicker` and `Select`.
- **2026-11-26 (Full UI Redesign — `@eta-ui/react@0.5.0`)**:
  - Installed `@eta-ui/react@^0.5.0` and configured Tailwind CSS v4 Cascade Layers (`@eta-ui/react/styles.layer.css`), `--color-eta-*` tokens, SSR `<ThemeScript />`, `ThemeProvider`, `ToastProvider`, `TooltipProvider`, and `IsoDatePicker`.
  - Migrated 100% of Auth (`/login`), Backoffice Shell (`DashboardShell`, `SidebarNav`, `Topbar`), Analytics Dashboard (`/` with `StatGroup` & `BarChart`), all 14 dashboard modules, `ProductForm`, and Fullscreen POS Terminal (`/pos` + modular `pos-customer-drawer`, `pos-held-drawer`, `pos-receipt-dialog`) to `@eta-ui/react`.
  - Removed all 27 legacy UI files (`src/components/ui/*`, `src/hooks/use-mobile.ts`, `components.json`) and uninstalled 10 unused UI dependencies (`@base-ui/react`, `class-variance-authority`, `cn`, `date-fns`, `next-themes`, `react-day-picker`, `recharts`, `shadcn`, `sonner`, `tw-animate-css`).

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
| `0.6.0` | `2026-11-19` | Phase 5 | AI Agent | Recorded Phase 5 — Point of Sales Core completion (Payment, Sales, POS, CS-02/03/05/09/10 tests, fullscreen POS Terminal & `/sales`). |
| `0.7.0` | `2026-11-20` | Phase 6 | AI Agent | Recorded Phase 6 — Financial Management completion (`CashManagement`, `Sales` Returns/Refunds, `Expense`, CS-04/CS-08 tests, and frontend UI). |
| `0.7.1` | `2026-11-20` | Phase 6 | AI Agent | Logged `laravel-best-practices` hardening refinements (FormRequests, scoped Rule::exists/unique, safe upload storage, CashRegister view guards, deterministic ordering). |
| `0.8.0` | `2026-11-20` | Phase 7 | AI Agent | Recorded Phase 7 — Advanced Features completion (`Promotion`, Loyalty, `Notification`, `Analytics`, `FinancialReporting`, async exports, and frontend UI). |
| `1.0.0` | `2026-11-20` | Phase 8 | AI Agent | Recorded Phase 8 — Quality & Production Readiness completion (security headers, rate limiters, OpenAPI 3.1 test, deployment & backup runbook). |
| `1.0.1` | `2026-11-20` | Phase 8 | AI Agent | Logged official `shadcn/ui` CLI migration (including `Sidebar` & `DatePicker`) and complete frontend CRUD forms across all backoffice pages. |
| `1.1.0` | `2026-11-26` | UI Redesign | AI Frontend Architect | Logged full Dashboard & POS UI redesign to `@eta-ui/react@0.5.0` and removal of all unused legacy UI dependencies. |
