# Testing Strategy & Quality Assurance Plan

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-009` |
| **Version** | `1.0.0` |
| **Status** | `Approved Baseline` |
| **Last Updated** | `2026-11-19` |
| **Author** | QA Engineer (AI Agent) |

---

## 1. Testing Pyramid & Tooling

- **Backend Unit Tests**: Pest / PHPUnit (kalkulasi harga, diskon, pajak, MAC/COGS, stok, split payment, rekonsiliasi cash register).
- **Backend Feature / Integration Tests**: Pest / PHPUnit terhadap REST API `/api/v1` (auth, RBAC, store isolation, DB transactions, idempotency, concurrency locking).
- **Static Analysis & Lint**: Larastan (PHPStan Level 7) + Laravel Pint.
- **Frontend Verification**: TypeScript strict check (`tsc --noEmit`), ESLint, unit tests untuk hooks/formatters, serta build verification (`npm run build`).

---

## 2. Mandatory Critical Scenarios (10 Must-Pass Tests)

| ID | Critical Scenario | Expected System Behavior | Target Phase |
| :--- | :--- | :--- | :--- |
| `CS-01` | Dua kasir menjual 1 stok terakhir secara bersamaan | Locking `SELECT ... FOR UPDATE` memastikan hanya 1 transaksi berhasil; transaksi kedua gagal dengan `422 INSUFFICIENT_STOCK` tanpa negative stock. | Phase 3 / 5 |
| `CS-02` | Checkout dikirim dua kali dengan `Idempotency-Key` sama | Request kedua mengembalikan response tersimpan; stok hanya berkurang 1x dan payment hanya tercatat 1x. | Phase 5 |
| `CS-03` | Pembayaran gagal di tengah proses checkout | Seluruh perubahan di-rollback (atau transaksi bertahan di `pending_payment` tanpa memotong stok secara permanen). | Phase 5 |
| `CS-04` | Refund melebihi kuantitas yang dibeli (termasuk akumulasi partial refund) | Ditolak dengan `422 INVALID_REFUND_QUANTITY`; stok & kas tidak berubah. | Phase 6 |
| `CS-05` | Split payment dengan total pembayaran kurang dari `grand_total` | Ditolak dengan `422 INSUFFICIENT_PAYMENT`; status transaksi tidak berubah menjadi `paid`. | Phase 5 |
| `CS-06` | User mencoba mengakses data / membuat transaksi di outlet lain (`X-Store-Id`) | Diblokir dengan `403 FORBIDDEN` oleh `EnsureStoreAccess` + Policy. | Phase 1 |
| `CS-07` | Stock transfer gagal di tengah proses | `DB::transaction()` melakukan rollback penuh; stok gudang asal dan tujuan tetap konsisten dengan `stock_movements`. | Phase 3 |
| `CS-08` | Cash register ditutup saat masih ada transaksi `pending_payment` | Ditolak dengan `422 PENDING_TRANSACTIONS_EXIST` hingga transaksi diselesaikan/di-hold/dibatalkan. | Phase 6 |
| `CS-09` | Produk dihapus setelah pernah digunakan dalam transaksi penjualan | Hard delete ditolak; hanya soft delete yang diizinkan, dan detail transaksi historis tetap utuh. | Phase 2 / 5 |
| `CS-10` | Perubahan harga master produk setelah transaksi selesai | `sale_items` tetap mempertahankan `unit_price_snapshot` historis; laporan penjualan lama tidak berubah. | Phase 5 |

---

## 3. Verification Commands

```bash
# Backend
cd backend
vendor/bin/pint --parallel --test
vendor/bin/phpstan analyse
php artisan test

# Frontend
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI QA Engineer | Initial testing strategy, 10 mandatory critical scenario definitions (`CS-01`–`CS-10`), and CI verification commands. |
