# Database Design Specification

| Metadata | Value |
| :--- | :--- |
| **Document ID** | `DOC-003` |
| **Version** | `1.0.0` |
| **Status** | `Approved Baseline` |
| **Last Updated** | `2026-11-19` |
| **Author** | Database Architect (AI Agent) |

---

## 1. Database Engine & Global Standards

- **RDBMS**: MariaDB 10.11+ / MySQL 8.0+
- **Storage Engine**: `InnoDB` (wajib untuk ACID transaction, foreign keys, dan row-level locking).
- **Charset & Collation**: `utf8mb4` / `utf8mb4_unicode_ci`.
- **Timezone**: Semua kolom `TIMESTAMP` / `DATETIME` disimpan dalam **UTC**; konversi ke `store.timezone` dilakukan pada layer presentasi / reporting.

### Precision & Data Type Rules
| Data Type | SQL Column Definition | Notes |
| :--- | :--- | :--- |
| **Primary Key** | `BIGINT UNSIGNED AUTO_INCREMENT` | Internal join cepat; tambah kolom `uuid CHAR(36) UNIQUE` pada entitas publik bila perlu. |
| **Money / Price / Amount** | `DECIMAL(15, 2)` | **Dilarang keras** menggunakan `FLOAT` atau `DOUBLE`. |
| **Quantity / Stock** | `DECIMAL(15, 4)` | Mendukung satuan pecahan (Kg, Gram, Liter, Meter). |
| **Tax / Discount Rate (%)** | `DECIMAL(7, 4)` | Presisi hingga 4 angka di belakang koma (mis. `11.0000`). |
| **Currency Code** | `CHAR(3)` | Default `'IDR'`, siap untuk ekspansi multi-currency. |
| **Status / Type** | `VARCHAR(32)` + Index | Menggunakan PHP Backed Enums di aplikasi untuk fleksibilitas migrasi. |

### Audit Columns Standard
Tabel transaksi wajib menyertakan:
`id`, `organization_id`, `store_id` (bila scoped ke outlet), `transaction_number` (unik per organisasi), `status`, `created_by`, `updated_by`, `created_at`, `updated_at`.
Soft delete (`deleted_at`) **hanya** digunakan pada master data (`products`, `customers`, `suppliers`, `stores`, `users`) dan **tidak pernah** pada ledger (`stock_movements`, `audit_logs`, `payments`, `sales`).

---

## 2. Schema Design by Domain

### A. Organization, Store, Warehouse & IAM
| Table | Key Columns | Indexes & Constraints |
| :--- | :--- | :--- |
| `organizations` | `id`, `code`, `name`, `legal_name`, `tax_id`, `currency_code`, `inventory_valuation_method` (`mac`/`fifo`), `status` | `UNIQUE(code)` |
| `stores` | `id`, `organization_id`, `code`, `name`, `address`, `phone`, `email`, `timezone`, `operating_hours` (JSON), `default_tax_id`, `allow_negative_stock`, `status`, `deleted_at` | `UNIQUE(organization_id, code)`, `FK(organization_id)` |
| `warehouses` | `id`, `organization_id`, `store_id` (nullable for central WH), `code`, `name`, `is_default`, `status` | `UNIQUE(organization_id, code)`, `INDEX(store_id)` |
| `users` | `id`, `organization_id`, `name`, `email`, `phone`, `password`, `is_active`, `last_login_at`, `deleted_at` | `UNIQUE(email)`, `INDEX(organization_id, is_active)` |
| `user_store_assignments` | `id`, `user_id`, `store_id`, `warehouse_id` (nullable), `is_default` | `UNIQUE(user_id, store_id)` |
| `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions` | Standard Spatie Laravel Permission schema | Scoped by `organization_id` (teams feature optional/evaluated in Phase 1). |

### B. Catalog, Variants, Pricing & Tax
| Table | Key Columns | Indexes & Constraints |
| :--- | :--- | :--- |
| `categories` | `id`, `organization_id`, `parent_id`, `code`, `name`, `slug`, `is_active` | `UNIQUE(organization_id, code)`, `INDEX(parent_id)` |
| `brands` | `id`, `organization_id`, `code`, `name`, `is_active` | `UNIQUE(organization_id, code)` |
| `units` | `id`, `organization_id`, `code`, `name`, `allow_decimal` | `UNIQUE(organization_id, code)` |
| `unit_conversions` | `id`, `organization_id`, `from_unit_id`, `to_unit_id`, `multiplier` (`DECIMAL(15,4)`) | `UNIQUE(organization_id, from_unit_id, to_unit_id)` |
| `taxes` | `id`, `organization_id`, `code`, `name`, `rate` (`DECIMAL(7,4)`), `type` (`inclusive`/`exclusive`), `is_active` | `UNIQUE(organization_id, code)` |
| `products` | `id`, `organization_id`, `category_id`, `brand_id`, `base_unit_id`, `tax_id`, `product_type` (`standard`/`variant`/`bundle`/`service`/`non_stock`), `name`, `description`, `image_path`, `track_inventory`, `track_batch`, `track_serial`, `is_active`, `deleted_at` | `INDEX(organization_id, category_id, is_active)` |
| `product_variants` | `id`, `product_id`, `sku`, `name`, `attributes` (JSON), `purchase_price`, `selling_price`, `wholesale_price`, `min_selling_price`, `average_cost`, `min_stock`, `max_stock`, `reorder_point`, `is_active`, `deleted_at` | `UNIQUE(sku)`, `INDEX(product_id)` |
| `product_barcodes` | `id`, `organization_id`, `product_variant_id`, `barcode`, `is_primary` | `UNIQUE(organization_id, barcode)` |
| `product_bundles` | `id`, `bundle_variant_id`, `component_variant_id`, `quantity` (`DECIMAL(15,4)`) | `UNIQUE(bundle_variant_id, component_variant_id)` |
| `product_store_prices` | `id`, `store_id`, `product_variant_id`, `selling_price`, `wholesale_price`, `min_selling_price`, `effective_from`, `effective_to` | `INDEX(store_id, product_variant_id, effective_from, effective_to)` |
| `product_price_histories` | `id`, `organization_id`, `store_id` (nullable), `product_variant_id`, `price_type`, `old_price`, `new_price`, `reason`, `changed_by`, `created_at` | `INDEX(product_variant_id, created_at)` |

### C. Inventory & Ledger
| Table | Key Columns | Indexes & Constraints |
| :--- | :--- | :--- |
| `stock_batches` | `id`, `organization_id`, `product_variant_id`, `batch_number`, `manufactured_at`, `expired_at` | `UNIQUE(organization_id, product_variant_id, batch_number)`, `INDEX(expired_at)` |
| `inventory_stocks` | `id`, `organization_id`, `warehouse_id`, `product_variant_id`, `batch_id` (nullable), `qty_on_hand` (`DECIMAL(15,4)`), `qty_reserved` (`DECIMAL(15,4)`), `unit_cost` (`DECIMAL(15,2)`), `updated_at` | `UNIQUE(warehouse_id, product_variant_id, batch_id)` — target `SELECT ... FOR UPDATE`. |
| `stock_movements` | `id`, `organization_id`, `warehouse_id`, `product_variant_id`, `batch_id`, `movement_type` (`purchase_in`, `sale_out`, `sale_return`, `purchase_return`, `adjustment_in`, `adjustment_out`, `transfer_out`, `transfer_in`, `opname`), `qty_before`, `qty_change`, `qty_after`, `unit_cost`, `reference_type`, `reference_id`, `notes`, `created_by`, `created_at` | **Append-only**. `INDEX(warehouse_id, product_variant_id, created_at)`, `INDEX(reference_type, reference_id)` |
| `stock_adjustments` & `_items` | `adjustment_number`, `warehouse_id`, `reason`, `status` (`draft`/`approved`/`cancelled`), `approved_by` | `UNIQUE(organization_id, adjustment_number)` |
| `stock_transfers` & `_items` | `transfer_number`, `from_warehouse_id`, `to_warehouse_id`, `status` (`draft`/`in_transit`/`received`/`cancelled`), `shipped_at`, `received_at` | `UNIQUE(organization_id, transfer_number)` |
| `stock_opnames` & `_items` | `opname_number`, `warehouse_id`, `status`, `system_qty`, `counted_qty`, `variance_qty` | `UNIQUE(organization_id, opname_number)` |

### D. Partners & Purchasing
| Table | Key Columns | Indexes & Constraints |
| :--- | :--- | :--- |
| `suppliers` | `id`, `organization_id`, `code`, `company_name`, `contact_person`, `phone`, `email`, `address`, `tax_id`, `payment_terms_days`, `balance`, `is_active`, `deleted_at` | `UNIQUE(organization_id, code)` |
| `customers` | `id`, `organization_id`, `customer_group_id`, `code`, `name`, `phone`, `email`, `address`, `customer_type` (`walk_in`/`registered`/`member`/`wholesale`), `loyalty_points`, `credit_limit`, `balance`, `is_active`, `deleted_at` | `UNIQUE(organization_id, code)`, `INDEX(organization_id, phone)` |
| `purchase_orders` & `_items` | `po_number`, `supplier_id`, `warehouse_id`, `order_date`, `expected_date`, `subtotal`, `discount_total`, `tax_total`, `grand_total`, `status`, `approved_by` | `UNIQUE(organization_id, po_number)` |
| `goods_receipts` & `_items` | `grn_number`, `purchase_order_id`, `warehouse_id`, `received_at`, `qty_ordered`, `qty_received`, `qty_damaged`, `status` | `UNIQUE(organization_id, grn_number)` |
| `purchase_invoices` | `invoice_number`, `supplier_invoice_number`, `purchase_order_id`, `supplier_id`, `invoice_date`, `due_date`, `grand_total`, `paid_amount`, `payment_status` | `INDEX(supplier_id, payment_status, due_date)` |
| `purchase_payments` | `payment_number`, `purchase_invoice_id`, `payment_method_id`, `amount`, `paid_at`, `reference_no` | `INDEX(purchase_invoice_id)` |
| `purchase_returns` & `_items` | `return_number`, `purchase_order_id`, `supplier_id`, `warehouse_id`, `reason`, `total_amount`, `credit_note_no`, `status` | `UNIQUE(organization_id, return_number)` |

### E. POS, Sales, Payments, Promotions & Cash
| Table | Key Columns | Indexes & Constraints |
| :--- | :--- | :--- |
| `cash_registers` | `id`, `store_id`, `code`, `name`, `is_active` | `UNIQUE(store_id, code)` |
| `cash_register_sessions` | `id`, `store_id`, `cash_register_id`, `user_id`, `opened_at`, `closed_at`, `opening_balance`, `expected_cash`, `actual_cash`, `cash_difference`, `status` (`open`/`closed`), `closing_notes` | `INDEX(cash_register_id, status)`, `INDEX(user_id, status)` |
| `cash_register_movements` | `id`, `session_id`, `type` (`cash_in`/`cash_out`/`cash_expense`), `amount`, `reason`, `reference_type`, `reference_id`, `created_by`, `created_at` | `INDEX(session_id, type)` |
| `sales` | `id`, `organization_id`, `store_id`, `warehouse_id`, `cash_register_session_id`, `customer_id`, `cashier_id`, `transaction_number`, `status` (`draft`/`held`/`pending_payment`/`paid`/`partially_refunded`/`refunded`/`cancelled`), `subtotal`, `discount_total`, `tax_total`, `rounding_amount`, `grand_total`, `paid_total`, `change_amount`, `notes`, `completed_at`, `cancelled_at`, `cancellation_reason` | `UNIQUE(organization_id, transaction_number)`, `INDEX(store_id, status, completed_at)` |
| `sale_items` | `id`, `sale_id`, `product_variant_id`, `sku_snapshot`, `barcode_snapshot`, `product_name_snapshot`, `unit_name_snapshot`, `quantity`, `unit_price_snapshot`, `cost_price_snapshot`, `discount_amount`, `tax_rate_snapshot`, `tax_amount`, `line_total` | `INDEX(sale_id)`, `INDEX(product_variant_id)` |
| `payment_methods` | `id`, `organization_id`, `code`, `name`, `type` (`cash`/`debit`/`credit`/`transfer`/`qris`/`ewallet`/`store_credit`/`customer_credit`), `gateway_driver`, `is_active` | `UNIQUE(organization_id, code)` |
| `payments` | `id`, `organization_id`, `store_id`, `sale_id`, `payment_method_id`, `amount`, `tendered_amount`, `change_amount`, `status` (`pending`/`confirmed`/`failed`/`refunded`), `external_reference`, `gateway_payload` (JSON), `paid_at`, `created_by` | `INDEX(sale_id, status)`, `UNIQUE(external_reference)` |
| `sale_returns` & `_items` | `return_number`, `sale_id`, `store_id`, `warehouse_id`, `reason`, `refund_amount`, `refund_method_id`, `condition` (`resellable`/`damaged`), `status`, `approved_by` | `UNIQUE(organization_id, return_number)`, `INDEX(sale_id)` |
| `promotions` & `_rules` & `_usages` | `code`, `name`, `type`, `priority`, `is_stackable`, `starts_at`, `ends_at`, `usage_limit`, `usage_count`, `min_purchase`, `max_discount`, `rules` (JSON), `is_active` | `INDEX(organization_id, is_active, starts_at, ends_at)` |
| `expenses` & `expense_categories` | `expense_number`, `store_id`, `category_id`, `expense_date`, `amount`, `payment_method_id`, `description`, `attachment_path`, `status`, `approved_by` | `INDEX(store_id, expense_date, status)` |

### F. Governance & Platform
| Table | Key Columns | Indexes & Constraints |
| :--- | :--- | :--- |
| `idempotency_keys` | `id`, `organization_id`, `user_id`, `key`, `request_path`, `request_hash`, `response_status`, `response_body` (LONGTEXT), `expires_at`, `created_at` | `UNIQUE(user_id, key, request_path)` |
| `audit_logs` | `id`, `organization_id`, `store_id`, `user_id`, `action`, `module`, `entity_type`, `entity_id`, `old_values` (JSON), `new_values` (JSON), `ip_address`, `user_agent`, `request_id`, `created_at` | **Append-only**. `INDEX(organization_id, module, created_at)`, `INDEX(entity_type, entity_id)` |
| `settings` | `id`, `organization_id`, `store_id` (nullable), `group`, `key`, `value` (JSON) | `UNIQUE(organization_id, store_id, group, key)` |

---

## Document Track Record

| Version | Date | Phase | Author | Summary of Changes |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | `2026-11-19` | Phase 0 | AI Database Architect | Initial complete relational schema specification (InnoDB, DECIMAL precision, snapshot columns, inventory ledger, idempotency, audit logs). |
