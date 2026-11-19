# Entity Relationship Diagram (ERD)

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-004` |
| **Version** | `1.0.0` |
| **Status** | `Approved Baseline` |
| **Last Updated** | `2026-11-19` |
| **Author** | Database Architect (AI Agent) |

---

## 1. Organization, IAM & Catalog ERD

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ STORES : owns
    STORES ||--o{ WAREHOUSES : has
    ORGANIZATIONS ||--o{ USERS : employs
    USERS ||--o{ USER_STORE_ASSIGNMENTS : assigned
    STORES ||--o{ USER_STORE_ASSIGNMENTS : grants_access

    ORGANIZATIONS ||--o{ CATEGORIES : defines
    CATEGORIES ||--o{ CATEGORIES : parent_of
    ORGANIZATIONS ||--o{ BRANDS : defines
    ORGANIZATIONS ||--o{ UNITS : defines
    UNITS ||--o{ UNIT_CONVERSIONS : converts_from
    ORGANIZATIONS ||--o{ TAXES : configures

    CATEGORIES ||--o{ PRODUCTS : categorizes
    BRANDS ||--o{ PRODUCTS : brands
    UNITS ||--o{ PRODUCTS : base_unit
    TAXES ||--o{ PRODUCTS : default_tax
    PRODUCTS ||--o{ PRODUCT_VARIANTS : contains
    PRODUCT_VARIANTS ||--o{ PRODUCT_BARCODES : tagged_with
    PRODUCT_VARIANTS ||--o{ PRODUCT_STORE_PRICES : priced_at
    STORES ||--o{ PRODUCT_STORE_PRICES : overrides
    PRODUCT_VARIANTS ||--o{ PRODUCT_PRICE_HISTORIES : logs
```

---

## 2. Inventory & Purchasing ERD

```mermaid
erDiagram
    WAREHOUSES ||--o{ INVENTORY_STOCKS : stores
    PRODUCT_VARIANTS ||--o{ INVENTORY_STOCKS : tracked_in
    STOCK_BATCHES ||--o{ INVENTORY_STOCKS : batch_of

    WAREHOUSES ||--o{ STOCK_MOVEMENTS : ledger
    PRODUCT_VARIANTS ||--o{ STOCK_MOVEMENTS : moved

    WAREHOUSES ||--o{ STOCK_ADJUSTMENTS : adjusts
    STOCK_ADJUSTMENTS ||--o{ STOCK_ADJUSTMENT_ITEMS : details

    WAREHOUSES ||--o{ STOCK_TRANSFERS : ships_or_receives
    STOCK_TRANSFERS ||--o{ STOCK_TRANSFER_ITEMS : details

    WAREHOUSES ||--o{ STOCK_OPNAMES : counts
    STOCK_OPNAMES ||--o{ STOCK_OPNAME_ITEMS : details

    SUPPLIERS ||--o{ PURCHASE_ORDERS : supplies
    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : orders
    PURCHASE_ORDERS ||--o{ GOODS_RECEIPTS : receives
    GOODS_RECEIPTS ||--o{ GOODS_RECEIPT_ITEMS : received_lines
    PURCHASE_ORDERS ||--o{ PURCHASE_INVOICES : billed
    PURCHASE_INVOICES ||--o{ PURCHASE_PAYMENTS : settled_by
    PURCHASE_ORDERS ||--o{ PURCHASE_RETURNS : returned
    PURCHASE_RETURNS ||--o{ PURCHASE_RETURN_ITEMS : return_lines
```

---

## 3. POS, Sales, Payments, Cash & Finance ERD

```mermaid
erDiagram
    STORES ||--o{ CASH_REGISTERS : operates
    CASH_REGISTERS ||--o{ CASH_REGISTER_SESSIONS : sessions
    USERS ||--o{ CASH_REGISTER_SESSIONS : cashier
    CASH_REGISTER_SESSIONS ||--o{ CASH_REGISTER_MOVEMENTS : cash_io

    STORES ||--o{ SALES : records
    CUSTOMERS ||--o{ SALES : places
    CASH_REGISTER_SESSIONS ||--o{ SALES : belongs_to
    SALES ||--o{ SALE_ITEMS : items
    PRODUCT_VARIANTS ||--o{ SALE_ITEMS : sold_variant
    SALES ||--o{ PAYMENTS : paid_by
    PAYMENT_METHODS ||--o{ PAYMENTS : uses

    SALES ||--o{ SALE_RETURNS : refunded_by
    SALE_RETURNS ||--o{ SALE_RETURN_ITEMS : returned_items
    SALE_ITEMS ||--o{ SALE_RETURN_ITEMS : references

    PROMOTIONS ||--o{ PROMOTION_USAGES : applied
    SALES ||--o{ PROMOTION_USAGES : applies_to

    STORES ||--o{ EXPENSES : incurs
    EXPENSE_CATEGORIES ||--o{ EXPENSES : categorizes
    USERS ||--o{ AUDIT_LOGS : triggers
```

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Database Architect | Initial ERD split across 3 readable domain diagrams (IAM/Catalog, Inventory/Purchasing, POS/Finance). |
