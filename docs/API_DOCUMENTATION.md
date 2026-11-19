# API Architecture & Documentation Standard

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-006` |
| **Version** | `1.0.0` |
| **Status** | `Approved Baseline` |
| **Last Updated** | `2026-11-19` |
| **Author** | Principal Software Architect (AI Agent) |

---

## 1. API Design Principles

1. **URI Versioning**: Seluruh endpoint berada di bawah prefix `/api/v1`.
2. **Use-Case Oriented**: Endpoint merepresentasikan *business action* (`/pos/transactions/{id}/complete`, `/cash-register/close`), bukan sekadar dump tabel database.
3. **Strict JSON & OpenAPI 3.1**: Auto-documented menggunakan **Dedoc Scramble** di `/docs/api`.
4. **Standard Headers**:
   - `Accept: application/json`
   - `Authorization: Bearer <token>` (Sanctum)
   - `X-Store-Id: <store_id>` (wajib untuk seluruh endpoint operasional outlet)
   - `Idempotency-Key: <uuid-v4>` (wajib untuk mutasi POS checkout, payment, refund, stock adjustment/transfer)

---

## 2. Standard Response & Error Envelopes

### Success Response
```json
{
  "success": true,
  "message": "Operation completed.",
  "data": { "id": 1 },
  "meta": {
    "request_id": "01J...",
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total": 100,
      "last_page": 5
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Insufficient stock for SKU-001.",
  "error_code": "INSUFFICIENT_STOCK",
  "errors": {
    "items.0.quantity": ["Available stock is 2, requested 5."]
  },
  "meta": {
    "request_id": "01J..."
  }
}
```

### Query Conventions
- **Pagination**: `?page=1&per_page=20` (maksimum `per_page=100`)
- **Search**: `?search=keyword`
- **Filtering**: `?filter[status]=paid&filter[store_id]=1`
- **Sorting**: `?sort=-created_at` (`-` untuk descending)

---

## 3. Core Endpoint Catalog (`/api/v1`)

### Auth & IAM
- `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`
- `GET/POST /users`, `GET/PUT/DELETE /users/{id}`, `POST /users/{id}/activate`, `POST /users/{id}/deactivate`, `POST /users/{id}/reset-password`
- `GET/POST /roles`, `PUT /roles/{id}/permissions`, `GET /permissions`

### Organization, Store & Warehouse
- `GET/POST/PUT /organizations`, `GET/POST/PUT /stores`, `GET/POST/PUT /warehouses`

### Catalog & Pricing
- `GET/POST/PUT/DELETE /products`, `GET /products/barcode/{code}`, `GET /products/{id}/price-history`
- `GET/POST/PUT/DELETE /categories`, `/brands`, `/units`, `/taxes`

### Inventory
- `GET /inventory` (stock overview per store/warehouse/product)
- `GET /inventory/movements` (immutable ledger)
- `POST /inventory/reconcile` (cek konsistensi saldo vs ledger)
- `GET/POST /inventory/adjustments`, `POST /inventory/adjustments/{id}/approve`
- `GET/POST /inventory/transfers`, `POST /inventory/transfers/{id}/ship`, `POST /inventory/transfers/{id}/receive`
- `GET/POST /inventory/opnames`, `POST /inventory/opnames/{id}/finalize`

### Purchasing & Partners
- `GET/POST/PUT/DELETE /suppliers`, `/customers`
- `GET/POST /purchasing/orders`, `POST /purchasing/orders/{id}/approve`, `POST /purchasing/orders/{id}/cancel`
- `GET/POST /purchasing/goods-receipts`, `POST /purchasing/goods-receipts/{id}/confirm`
- `GET/POST /purchasing/invoices`, `POST /purchasing/invoices/{id}/payments`
- `GET/POST /purchasing/returns`

### Point of Sales & Sales Management
- `POST /pos/transactions` (create / draft)
- `GET /pos/transactions`, `GET /pos/transactions/{id}`
- `POST /pos/transactions/{id}/hold`, `POST /pos/transactions/{id}/resume`
- `POST /pos/transactions/{id}/payments` (single / split payment)
- `POST /pos/transactions/{id}/complete` (atomic finalize + stock deduct + receipt)
- `POST /pos/transactions/{id}/void` (cancel with reason & supervisor auth)
- `POST /pos/transactions/{id}/refund` (partial / full return & refund)
- `GET /pos/transactions/{id}/receipt` (JSON / Thermal 58mm / 80mm / PDF)

### Cash Management, Expenses, Promotions & Reports
- `POST /cash-register/open`, `GET /cash-register/current`, `POST /cash-register/cash-in`, `POST /cash-register/cash-out`, `POST /cash-register/close`
- `GET/POST /expenses`, `POST /expenses/{id}/approve`
- `GET/POST/PUT /promotions`, `POST /promotions/evaluate`
- `GET /dashboard/{role}`, `GET /reports/{type}`, `POST /reports/{type}/export`
- `GET /audit-logs`, `GET /notifications`, `GET/PUT /settings`

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Architect | Initial RESTful API standards, headers, response/error envelopes, and full `/api/v1` endpoint catalog. |
