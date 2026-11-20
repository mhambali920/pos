# Production Deployment, Monitoring & Backup Runbook

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-015` |
| **Version** | `1.0.0` |
| **Status** | `Production Baseline` |
| **Last Updated** | `2026-11-20` |
| **Author** | Platform & SRE Team (AI Agent) |

---

## 1. Production Architecture Overview

- **Backend (`backend/`)**: Laravel 13 (PHP 8.4+, PHP-FPM + Nginx), Modular Monolith under `app/Modules/*`, OpenAPI 3.1 via Dedoc Scramble (`/docs/api`).
- **Frontend (`frontend/`)**: Next.js App Router (Node.js 20+ LTS, standalone/production server behind Nginx reverse proxy).
- **Database**: MariaDB 10.11+ / MySQL 8.0+ (`InnoDB`, `utf8mb4_unicode_ci`, `UTC` timezone, strict SQL mode).
- **Cache, Sessions & Queue**: Redis 7+ (separate logical DBs or prefixes for cache, sessions, rate limiters, and async report export queues).
- **Private Storage**: Non-public `local` / S3 disk for sensitive files (expense receipts, generated report exports).

---

## 2. Pre-Deployment Security & Environment Checklist

1. **Application Environment (`backend/.env`)**:
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `APP_KEY` generated via `php artisan key:generate`
   - `LOG_CHANNEL=stack` (JSON structured logs with `request_id`, `store_id`, `organization_id` via `Context`)
   - `DB_CONNECTION=mysql` / `mariadb` with dedicated least-privilege DB user
   - `CACHE_STORE=redis`, `QUEUE_CONNECTION=redis`, `SESSION_DRIVER=redis`
   - `BCRYPT_ROUNDS=12`
   - `SANCTUM_STATEFUL_DOMAINS` & `CORS` restricted to production frontend origin(s)
2. **Frontend Environment (`frontend/.env.production`)**:
   - `NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com/api/v1`
3. **Security Controls Verified**:
   - Security response headers enforced by `AttachSecurityHeaders` (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`).
   - Named rate limiters active: `login` (`5/min`), `api` (`120/min`), `exports` (`10/min`).
   - Multi-store isolation (`EnsureStoreAccess`), RBAC (`Spatie Permission`), Idempotency (`EnforceIdempotency`), and append-only `audit_logs` & `stock_movements` verified by automated tests (`CS-01`–`CS-10`).

---

## 3. Zero-Downtime Deployment Procedure

### Backend (`backend/`)
```bash
composer install --no-dev --optimize-autoloader
php artisan down --retry=60
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan scramble:cache
php artisan queue:restart
php artisan up
```

### Frontend (`frontend/`)
```bash
npm ci
npm run build
# Restart Node/PM2/systemd service serving `npm run start`
```

### Required Background Processes
1. **Queue Worker** (Supervisor / systemd):
   ```bash
   php artisan queue:work redis --queue=default --sleep=3 --tries=3 --max-time=3600
   ```
2. **Scheduler Cron** (`* * * * *`):
   ```bash
   php /var/www/pos/backend/artisan schedule:run >> /dev/null 2>&1
   ```

---

## 4. Database Backup & Recovery Runbook

### Automated Daily Logical Backup (MariaDB/MySQL)
```bash
#!/usr/bin/env bash
set -euo pipefail
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_DIR="/var/backups/pos-db"
mkdir -p "${BACKUP_DIR}"

mysqldump --single-transaction --routines --triggers --hex-blob \
  -h "${DB_HOST}" -u "${DB_BACKUP_USER}" -p"${DB_BACKUP_PASS}" "${DB_DATABASE}" \
  | gzip -9 > "${BACKUP_DIR}/pos-${TIMESTAMP}.sql.gz"

# Retain 30 days locally; sync encrypted copies to off-site object storage (S3/GCS)
find "${BACKUP_DIR}" -name "pos-*.sql.gz" -mtime +30 -delete
```

### Restore & Integrity Verification
1. Provision a clean staging/recovery database instance.
2. Restore: `gunzip -c pos-<timestamp>.sql.gz | mysql -h ... -u ... -p <db_name>`
3. Run `POST /api/v1/inventory/reconcile` to confirm **0 discrepancies** between `inventory_stocks` and `stock_movements`.
4. Verify `/up` health check returns `200 OK`.

---

## 5. Monitoring, Health Checks & Incident Response

- **Liveness / Readiness Probe**: `GET /up` (HTTP `200`).
- **OpenAPI Schema Health**: `GET /docs/api.json` (protected in production via `RestrictedDocsAccess`).
- **Key Metrics to Alert On**:
  - HTTP 5xx rate > 0.5% over 5 minutes
  - Queue depth > 100 or failed jobs > 0 (`php artisan queue:failed`)
  - Database slow queries > 500ms or lock wait timeouts on `inventory_stocks`
  - Cash register shortage alerts and inventory reconciliation discrepancies (`discrepancies_count > 0`)

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-20` | Phase 8 | AI Platform/SRE | Created production deployment, security hardening, monitoring, and backup/recovery runbook. |
