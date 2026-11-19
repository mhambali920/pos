# Security Architecture & Hardening Guide

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-007` |
| **Version** | `1.0.0` |
| **Status** | `Approved Baseline` |
| **Last Updated** | `2026-11-19` |
| **Author** | Security Engineer (AI Agent) |

---

## 1. Threat Model & Core Security Principles

1. **Zero Trust Frontend**: Backend **tidak pernah** mempercayai harga, diskon, pajak, total, status pembayaran, atau `organization_id` dari frontend.
2. **Defense in Depth**: Otorisasi ditegakkan di tiga lapisan: Middleware (`auth:sanctum`, `store.access`), Policy (`Gate::authorize`), dan Scoped Query (`organization_id` & `store_id`).
3. **Least Privilege**: Role `Cashier` tidak memiliki akses ke harga beli (`cost_price`/`average_cost`), hapus produk, atau penyesuaian stok manual.

---

## 2. Security Controls

| Control Area | Implementation |
| :--- | :--- |
| **Authentication** | Laravel Sanctum personal access tokens / SPA cookies dengan masa berlaku token terkonfigurasi dan revokasi saat logout/deaktivasi user. |
| **Password Security** | Argon2id / Bcrypt (`BCRYPT_ROUNDS=12`), password policy minimum 8 karakter dengan kompleksitas standar, throttling login (`5 attempts / minute`). |
| **RBAC & Permissions** | Spatie Laravel Permission dengan format `<module>.<feature>.<action>` (contoh: `pos.transaction.refund`, `inventory.adjustment.approve`). |
| **Multi-Store Isolation** | Middleware `EnsureStoreAccess` memverifikasi header `X-Store-Id` terhadap `user_store_assignments` kecuali user memiliki permission `stores.access_all`. |
| **SQL Injection & XSS** | 100% Eloquent / Query Builder terparameterisasi; validasi ketat via `FormRequest`; output JSON ter-escape otomatis; frontend React/Next.js tanpa `dangerouslySetInnerHTML`. |
| **Rate Limiting** | Redis-backed rate limiters berbeda untuk `/auth/login`, API umum, dan endpoint export berat. |
| **File Uploads** | Validasi MIME type & ukuran file, nama file diacak (UUID), disimpan di disk non-public untuk lampiran sensitif (bukti expense/invoice). |
| **Payment Verification** | Webhook gateway wajib diverifikasi HMAC signature + server-to-server status query sebelum mengubah status payment ke `confirmed`. |
| **Audit Trail** | Tabel `audit_logs` bersifat *append-only* (tanpa endpoint mutasi/hapus); merekam user, aksi, old/new value, IP, request ID, dan timestamp untuk seluruh operasi sensitif. |

---

## 3. Sensitive Operations Requiring Explicit Authorization & Audit Log

- Login, logout, failed login berulang, dan reset password.
- Perubahan role, permission, dan penugasan outlet user.
- Perubahan harga produk dan *price/discount override* di POS.
- Stock adjustment, stock transfer, dan finalisasi stock opname.
- Void/cancellation penjualan, retur, dan refund.
- Cash in, cash out, dan penutupan (serta koreksi) cash register session.
- Perubahan konfigurasi pajak dan system settings.

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Security Engineer | Initial security controls, zero-trust backend pricing policy, multi-store isolation, and audit trail requirements. |
