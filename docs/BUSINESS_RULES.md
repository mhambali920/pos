# Core Business Rules & Data Integrity Specification

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-005` |
| **Version** | `1.0.0` |
| **Status** | `Approved Baseline` |
| **Last Updated** | `2026-11-19` |
| **Author** | Principal Software Architect (AI Agent) |

---

## 1. Fundamental Integrity Invariants

| Rule ID | Domain | Rule Description | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| `BR-001` | Sales | Transaksi penjualan berstatus `paid`, `partially_refunded`, atau `refunded` **tidak boleh dihapus**. | Tidak ada endpoint `DELETE`; koreksi hanya via `sale_returns` atau `void` berotorisasi. |
| `BR-002` | Sales | Setiap `sale_return` wajib merujuk ke `sale_id` dan `sale_item_id` asal; total qty retur akumulatif tidak boleh melebihi `sale_item.quantity`. | Validasi di `CreateSaleReturnAction` dalam `DB::transaction()`. |
| `BR-003` | Inventory | Setiap perubahan stok wajib menghasilkan baris `stock_movements` dengan sumber transaksi (`reference_type`, `reference_id`). | Semua mutasi hanya melalui `InventoryLedgerService`; tidak boleh update `inventory_stocks` langsung. |
| `BR-004` | Inventory | Pengurangan stok harus atomik dan bebas race condition. | `DB::transaction()` + `ORDER BY id ASC` + `lockForUpdate()` (`SELECT ... FOR UPDATE`). |
| `BR-005` | Inventory | Negative stock dilarang secara default kecuali flag `store.allow_negative_stock = true`. | Pengecekan `qty_on_hand - qty_reserved >= requested_qty` sebelum pengurangan. |
| `BR-006` | Pricing | Harga, diskon, pajak, dan subtotal pada transaksi selalu dihitung ulang di backend dan disimpan sebagai **snapshot**. | Perubahan harga master produk tidak pernah mengubah transaksi historis. |
| `BR-007` | Pricing | Override harga di POS hanya diizinkan bagi user dengan permission `pos.override_price`, tidak boleh di bawah `min_selling_price`, dan wajib tercatat di `audit_logs`. | Policy + `FormRequest` + `AuditLogListener`. |
| `BR-008` | Payment | Checkout & pembayaran harus **idempotent**; pembayaran tidak boleh tercatat ganda. | Wajib header `Idempotency-Key` (UUID v4) + tabel `idempotency_keys` + unique `external_reference`. |
| `BR-009` | Payment | Split payment hanya dapat melunasi transaksi jika `SUM(confirmed_payments.amount) >= grand_total`. Kembalian hanya berlaku untuk porsi `cash`. | Validasi di `CompleteCheckoutAction`. |
| `BR-010` | Payment | Pembayaran non-tunai (QRIS/E-Wallet/Card) tidak boleh dinyatakan `confirmed` hanya dari callback frontend. | Server-side gateway verification / webhook signature validation. |
| `BR-011` | Cash Register | Transaksi POS tunai mewajibkan sesi register `open`. Register tidak dapat ditutup jika masih ada transaksi `pending_payment`. | Guard di `CompleteCheckoutAction` & `CloseCashRegisterAction`. |
| `BR-012` | Cash Register | Sesi register yang sudah `closed` bersifat *immutable*. | Koreksi pasca-tutup wajib melalui *adjustment entry* + permission khusus + audit log. |
| `BR-013` | Security | User hanya boleh mengakses data outlet yang ditugaskan (`user_store_assignments`), kecuali memiliki permission `stores.access_all`. | `EnsureStoreAccess` Middleware + Model Policies. |
| `BR-014` | Finance | Seluruh kalkulasi uang wajib menggunakan *decimal arithmetic* (`bcmath` / Money VO) dan disimpan dalam `DECIMAL(15,2)`. | Static analysis + unit test presisi desimal. |
| `BR-015` | Catalog | Produk yang sudah pernah dipakai dalam transaksi tidak boleh di-hard-delete. | Foreign key `RESTRICT` + soft delete (`deleted_at`). |

---

## 2. Calculation Formulas

### A. Line Item & Tax Calculation
- **Tax Exclusive**:
  - `line_subtotal = quantity * unit_price`
  - `taxable_amount = line_subtotal - line_discount`
  - `tax_amount = taxable_amount * (tax_rate / 100)`
  - `line_total = taxable_amount + tax_amount`
- **Tax Inclusive**:
  - `line_total = (quantity * unit_price) - line_discount`
  - `tax_amount = line_total - (line_total / (1 + tax_rate / 100))`
  - `taxable_amount = line_total - tax_amount`

### B. Moving Average Cost (MAC — Default Valuation)
Saat Goods Receipt dikonfirmasi (`qty_in > 0`):
```text
new_average_cost = ((current_qty * current_avg_cost) + (qty_in * incoming_unit_cost)) / (current_qty + qty_in)
```

### C. Cash Register Reconciliation
```text
expected_cash = opening_balance + cash_sales + cash_in - cash_out - cash_refund - cash_expense
cash_difference = actual_cash - expected_cash
```
- `cash_difference == 0`: Balanced
- `cash_difference > 0`: Overage (Lebih)
- `cash_difference < 0`: Shortage (Kurang) — memicu notifikasi ke Store Manager jika melewati threshold.

---

## 3. Transaction State Machines

### Sales Lifecycle
`draft` -> `held` (opsional) -> `pending_payment` -> `paid` -> (`partially_refunded` -> `refunded`)
`draft` / `held` / `pending_payment` -> `cancelled`

### Stock Transfer Lifecycle
`draft` -> `in_transit` (potong stok gudang asal via `transfer_out`) -> `received` (tambah stok gudang tujuan via `transfer_in`)
`draft` -> `cancelled` (jika sudah `in_transit` dibatalkan, wajib membuat reversal `transfer_in` kembali ke gudang asal).

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Architect | Initial definition of 15 core business rules (`BR-001`–`BR-015`), financial formulas (Tax, MAC, Cash Register), and state machines. |
