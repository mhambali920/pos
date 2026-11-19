# ADR-0001: Modular Monolith Architecture & Monorepo Layout

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `ADR-0001` |
| **Status** | `Accepted` |
| **Date** | `2026-11-19` |
| **Author** | Principal Software Architect (AI Agent) |

---

## Context
Enterprise POS membutuhkan konsistensi transaksional ACID yang ketat antara Sales, Inventory, Payment, Cash Register, dan Audit Log, sekaligus harus mudah dikembangkan menjadi sistem ERP skala besar di masa depan tanpa rewrite.

## Decision
1. Backend dibangun menggunakan **Laravel 13 Modular Monolith** di `backend/app/Modules/<ModuleName>/` dengan 27 modul berbatas jelas.
2. Komunikasi lintas modul hanya melalui **Contracts (Interfaces)** untuk operasi sinkron dalam satu DB transaction, atau **Domain Events** untuk side-effect asinkron.
3. Repository menggunakan struktur **Monorepo** (`backend/`, `frontend/`, `docs/`) dengan satu Git history di root.

## Consequences
- **Positif**: Transaksi ACID tunggal di InnoDB (bebas kompleksitas Saga/2PC), deployment sederhana, refactoring lintas domain aman, dan tetap memiliki batas modul tegas jika suatu saat modul tertentu (mis. Reporting) perlu diekstrak.
- **Negatif**: Memerlukan disiplin ketat untuk tidak saling mengimpor Model internal antar modul (ditegakkan via code review & static analysis).

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Architect | Recorded accepted decision for Modular Monolith and Monorepo (`backend/` + `frontend/` + `docs/`). |
