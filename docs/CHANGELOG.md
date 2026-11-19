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

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `0.1.0` | `2026-11-19` | Phase 0 | AI Agent | Initialized changelog with Phase 0 fresh install and documentation baseline. |
| `0.1.1` | `2026-11-19` | Phase 0 | AI Agent | Added root `AGENTS.md` documentation-compliance rules and Laravel Boost backend setup. |
| `0.2.0` | `2026-11-19` | Phase 1 | AI Agent | Recorded Phase 1 — Foundation completion (backend modules + frontend shell). |
| `0.2.1` | `2026-11-19` | Phase 1 | AI Agent | Logged `laravel-best-practices` hardening refinements (preventLazyLoading, Policies, Context, named login limiter, apiResource). |
