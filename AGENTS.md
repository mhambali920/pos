# AI Agent Mandatory Governance Rules — Enterprise POS Monorepo

Aturan ini **WAJIB** dipatuhi oleh setiap AI coding agent yang bekerja di repository ini (`backend/`, `frontend/`, dan `docs/`).

---

## 1. Documentation as Single Source of Truth (SSOT)

1. **Baca Dokumentasi Sebelum Mengubah Kode**:
   - Sebelum merancang atau mengimplementasikan fitur apa pun, agen WAJIB memeriksa dokumen terkait di `docs/`:
     - Arsitektur & batas modul: `docs/ARCHITECTURE.md` & `docs/adr/*`
     - Skema database & presisi data: `docs/DATABASE_DESIGN.md` & `docs/ERD.md`
     - Aturan bisnis & integritas: `docs/BUSINESS_RULES.md`
     - Kontrak REST API: `docs/API_DOCUMENTATION.md`
     - Keamanan & isolasi outlet: `docs/SECURITY.md`
     - Standar kode & DoD: `docs/DEVELOPMENT_GUIDE.md`
     - Strategi & 10 skenario kritis test: `docs/TESTING_STRATEGY.md`
     - Roadmap & progres: `docs/IMPLEMENTATION_ROADMAP.md`, `docs/FEATURE_CHECKLIST.md`, `docs/PROGRESS_TRACKER.md`
2. **Dilarang Melanggar Keputusan Arsitektur (ADR)**:
   - Jangan mengubah teknologi inti, struktur monorepo (`backend/` + `frontend/` + `docs/`), arsitektur Modular Monolith, atau aturan integritas data tanpa persetujuan eksplisit user dan pencatatan ADR baru di `docs/adr/`.
3. **Wajib Memperbarui Dokumentasi & Document Track Record**:
   - Setiap perubahan arsitektur, skema database, endpoint API, business rule, atau penyelesaian fitur WAJIB diikuti pembaruan dokumen terkait di `docs/`.
   - **Setiap dokumen yang dibuat atau diubah WAJIB memperbarui tabel `## Document Track Record`** (versi, tanggal, fase, author, dan ringkasan perubahan).
   - Perbarui `docs/FEATURE_CHECKLIST.md`, `docs/PROGRESS_TRACKER.md`, dan `docs/CHANGELOG.md` setiap kali sebuah milestone/fitur selesai.

---

## 2. Architecture & Business Logic Discipline

1. **Zero Business Logic in Frontend & Thin Controllers**:
   - Frontend (`frontend/`) hanya untuk presentasi, UX, dan validasi form awal (Zod). Seluruh perhitungan harga, diskon, pajak, stok, dan total transaksi **WAJIB** diverifikasi dan dihitung ulang di `backend/`.
   - Backend (`backend/`) meletakkan business logic di `app/Modules/<ModuleName>/Actions/` atau `Services/`, bukan di Controller atau Model.
2. **Strict Data & Financial Integrity**:
   - Semua nilai uang menggunakan `DECIMAL(15, 2)` di DB dan decimal arithmetic (`bcmath` / Money VO) di PHP. Dilarang menggunakan `FLOAT`/`DOUBLE`.
   - Semua mutasi stok wajib melalui `InventoryLedgerService` dalam `DB::transaction()` dengan `SELECT ... FOR UPDATE` (`lockForUpdate()`) dan menghasilkan entri append-only di `stock_movements`.
   - Transaksi penjualan selesai (`paid`/`refunded`) tidak boleh dihapus; koreksi hanya via `sale_returns` atau `void` berotorisasi.
   - Operasi mutasi kritikal (POS checkout, payment, refund) wajib *idempotent* (`Idempotency-Key`).
3. **Security & Multi-Store Isolation**:
   - Setiap endpoint operasional wajib menerapkan autentikasi (Sanctum), otorisasi granular (Spatie Permission + Policy), dan isolasi outlet (`X-Store-Id` divalidasi terhadap `user_store_assignments`).
   - Operasi sensitif wajib menulis ke `audit_logs`.

---

## 3. Verification & Definition of Done

1. **Wajib Menjalankan Verifikasi Sebelum Menyatakan Selesai**:
   - Backend (`backend/`): `vendor/bin/pint --parallel --test`, `vendor/bin/phpstan analyse`, dan `php artisan test`.
   - Frontend (`frontend/`): `npm run lint`, `npx tsc --noEmit`, dan `npm run build`.
2. **Jangan Membuat Asumsi Diam-Diam**:
   - Jika menemukan ambiguitas requirement yang berdampak besar pada bisnis atau skema data, dokumentasikan dan tanyakan kepada user terlebih dahulu.
3. **Git Hygiene**:
   - Jangan melakukan `git commit` secara otomatis kecuali diminta secara eksplisit oleh user.
