# Known Issues & Future Improvements

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-014` |
| **Version** | `1.0.0` |
| **Status** | `Active` |
| **Last Updated** | `2026-11-19` |
| **Author** | Principal Software Architect (AI Agent) |

---

## 1. Known Issues (Current Baseline)

| ID | Area | Description | Severity | Planned Resolution |
| :--- | :--- | :--- | :---: | :--- |
| `KI-001` | Backend DB Config | Fresh Laravel install masih menggunakan `DB_CONNECTION=sqlite` secara default di `backend/.env.example` dan `phpunit.xml`. | Medium | Dikonfigurasi ke MariaDB/MySQL (InnoDB) & Redis pada awal Phase 1. |
| `KI-002` | Root Workspace | Folder kosong `storage/` kadang dibuat ulang di root oleh tool eksternal yang memantau root workspace. | Low | Diabaikan atau dibersihkan saat konfigurasi tooling monorepo. |

---

## 2. Future Improvements (Post-v1 / ERP Expansion)

1. **Offline-First POS Mode**: Penyimpanan katalog & antrean transaksi lokal menggunakan IndexedDB + Service Worker dengan conflict resolution saat koneksi kembali.
2. **Full Double-Entry Accounting (General Ledger)**: Integrasi otomatis jurnal debit/kredit dari sales, COGS, purchasing, expenses, dan cash register ke Chart of Accounts (COA), Balance Sheet, dan Profit & Loss.
3. **FIFO / LIFO Cost Layer Valuation**: Menambahkan opsi *cost layers* per batch di samping default Moving Average Cost (MAC).
4. **Multi-Currency Live Exchange Rates**: Kurs harian otomatis untuk bisnis retail lintas negara / impor.
5. **Omnichannel & Marketplace Sync**: Sinkronisasi stok & pesanan dengan e-commerce (Tokopedia, Shopee, WooCommerce, Shopify).
6. **Hardware Bridge (ESC/POS Native)**: Integrasi WebUSB / WebSerial / local print bridge untuk thermal printer, cash drawer kick, dan customer pole display.

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Architect | Initialized Known Issues log (`KI-001`–`KI-002`) and Post-v1 ERP expansion roadmap. |
