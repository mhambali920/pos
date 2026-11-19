# Development Guide & Engineering Standards

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-008` |
| **Version** | `1.0.0` |
| **Status** | `Approved Baseline` |
| **Last Updated** | `2026-11-19` |
| **Author** | Senior Full Stack Engineer (AI Agent) |

---

## 1. Local Environment Prerequisites

- **PHP**: `>= 8.3` (workspace saat ini: `8.5.12`) dengan ekstensi `pdo_mysql`, `bcmath`, `intl`, `redis`, `mbstring`.
- **Composer**: `>= 2.7`
- **Node.js**: `>= 20 LTS` (workspace saat ini: `v24.19.0`) + `npm`
- **Database**: MariaDB 10.11+ / MySQL 8.0+ (InnoDB)
- **Cache/Queue**: Redis 7+

---

## 2. Running the Monorepo Locally

### Backend (`backend/`)
```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### Frontend (`frontend/`)
```bash
cd frontend
npm install
npm run dev
```

---

## 3. Coding Standards & Conventions

### Backend (Laravel 13)
- **Formatter**: Laravel Pint (`vendor/bin/pint --parallel`).
- **Static Analysis**: Larastan / PHPStan Level 7 (`vendor/bin/phpstan analyse`).
- **Testing**: Pest / PHPUnit (`php artisan test`).
- **Architecture Rules**:
  - Business logic diletakkan di `Actions/` atau `Services/`, **bukan** di Controller atau Model.
  - Seluruh operasi mutasi finansial/stok wajib dibungkus `DB::transaction()`.
  - Gunakan PHP 8.5 strict types (`declare(strict_types=1);`), readonly DTOs, dan Backed Enums.

### Frontend (Next.js + TypeScript)
- **Strict TypeScript**: Hindari `any`; semua payload API dan form divalidasi dengan **Zod**.
- **State Separation**:
  - Data server -> **TanStack Query**.
  - State lokal UI/POS (cart, active store, register session) -> **Zustand**.
  - Form state -> **React Hook Form** + `@hookform/resolvers/zod`.
- **No Business Logic**: Frontend hanya menampilkan estimasi preview; hasil final selalu berasal dari response backend.

---

## 4. Definition of Done (DoD)

Sebuah fitur dinyatakan selesai hanya apabila:
- [ ] Business logic terimplementasi di `Actions/` / `Services/`.
- [ ] Database migration + index + foreign key tersedia.
- [ ] Request validation (`FormRequest` / `Zod`) tersedia.
- [ ] Authorization (`Policy` + Permission + Store isolation) tersedia.
- [ ] API endpoint + consistent `ApiResource` tersedia.
- [ ] Frontend UI (loading, empty, error states) tersedia jika relevan.
- [ ] Automated tests (Unit & Feature) lulus 100% tanpa regression.
- [ ] Linter & static analysis (`pint`, `phpstan`, `eslint`, `tsc`) lulus tanpa error.
- [ ] Dokumentasi & Track Record pada file `docs/` terkait telah diperbarui.

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Full Stack Engineer | Initial monorepo setup instructions, backend/frontend coding standards, and Definition of Done checklist. |
