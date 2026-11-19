# ADR-0002: Sanctum Authentication & Single-Database Multi-Store Isolation

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `ADR-0002` |
| **Status** | `Accepted` |
| **Date** | `2026-11-19` |
| **Author** | Principal Software Architect (AI Agent) |

---

## Context
Aplikasi harus mendukung multi-organisasi, multi-outlet, dan 10 role default yang diakses oleh Next.js Backoffice serta POS Terminal dengan isolasi data ketat antar cabang.

## Decision
1. **Authentication**: Menggunakan **Laravel Sanctum** (token/SPA cookie) yang ringan, native untuk Next.js first-party client, dan mudah diperluas untuk POS terminal/mobile.
2. **Authorization**: Menggunakan **Spatie Laravel Permission** dengan konvensi `<module>.<feature>.<action>`.
3. **Multi-Tenancy & Multi-Store**: Menggunakan **Single Database Shared Schema** dengan kolom `organization_id` dan `store_id`, composite indexes, middleware `EnsureStoreAccess` (memvalidasi header `X-Store-Id`), serta Policy enforcement.

## Consequences
- **Positif**: Pelaporan lintas outlet (Owner Dashboard) cepat tanpa cross-database joins, migrasi skema tunggal, dan operasional backup/restore sederhana.
- **Negatif**: Setiap query operasional wajib menerapkan scope `organization_id` / `store_id` agar tidak terjadi kebocoran data lintas outlet (diverifikasi lewat `CS-06` feature tests).

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Architect | Recorded accepted decision for Sanctum auth, Spatie RBAC, and single-DB multi-store isolation. |
