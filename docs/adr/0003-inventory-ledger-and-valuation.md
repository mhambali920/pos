# ADR-0003: Ledger-Based Inventory, Row-Level Locking & Moving Average Cost

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `ADR-0003` |
| **Status** | `Accepted` |
| **Date** | `2026-11-19` |
| **Author** | Database Architect (AI Agent) |

---

## Context
Sistem POS multi-kasir rentan terhadap *race condition* (overselling stok terakhir), hilangnya jejak mutasi stok, dan inkonsistensi valuasi HPP (COGS) apabila stok diperbarui secara langsung tanpa ledger dan locking.

## Decision
1. **Ledger-Based Mutations**: Setiap perubahan stok wajib melalui `InventoryLedgerService` yang menulis baris *append-only* di `stock_movements` sekaligus memperbarui saldo di `inventory_stocks` dalam satu `DB::transaction()`.
2. **Concurrency Control**: Sebelum mutasi stok, baris `inventory_stocks` dikunci menggunakan `SELECT ... FOR UPDATE` (`lockForUpdate()`) dengan pengurutan deterministik (`ORDER BY id ASC`) untuk mencegah deadlock.
3. **Default Valuation**: Menggunakan **Moving Average Cost (MAC)** secara default (disimpan di `product_variants.average_cost` / `inventory_stocks.unit_cost`), dengan kolom `organizations.inventory_valuation_method` untuk kesiapan FIFO di masa depan.
4. **Currency & Precision**: Default mata uang **IDR** (`currency_code = 'IDR'`), seluruh kalkulasi memakai `bcmath` dan kolom `DECIMAL(15,2)` (uang) / `DECIMAL(15,4)` (kuantitas).

## Consequences
- **Positif**: Menjamin nol negative stock tanpa izin, audit trail 100% dapat direkonsiliasi, dan kalkulasi margin profit akurat.
- **Negatif**: Contention singkat pada baris SKU yang sangat laris secara bersamaan (dimitigasi dengan transaksi DB yang pendek dan deterministik).

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Database Architect | Recorded accepted decision for inventory ledger, deterministic `SELECT ... FOR UPDATE`, MAC valuation, and IDR decimal standards. |
