export interface ApiMeta {
  request_id: string;
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: ApiMeta;
}

export interface StoreSummary {
  id: number;
  code: string;
  name: string;
  timezone: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  allow_negative_stock?: boolean;
  status?: string;
}

export interface AuthUser {
  id: number;
  organization_id: number | null;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  roles: string[];
  permissions: string[];
  stores?: StoreSummary[];
}

export interface RoleItem {
  id: number;
  name: string;
  guard_name: string;
  permissions: string[];
}

export interface CategoryItem {
  id: number;
  parent_id: number | null;
  code: string;
  name: string;
  slug: string;
  is_active: boolean;
  parent?: { id: number; code: string; name: string } | null;
}

export interface BrandItem {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
}

export interface UnitItem {
  id: number;
  code: string;
  name: string;
  allow_decimal: boolean;
  conversions?: Array<{
    id: number;
    to_unit_id: number;
    to_unit_code: string | null;
    multiplier: string;
  }>;
}

export interface TaxItem {
  id: number;
  code: string;
  name: string;
  rate: string;
  type: "inclusive" | "exclusive";
  is_active: boolean;
}

export interface WarehouseItem {
  id: number;
  store_id: number | null;
  code: string;
  name: string;
  address: string | null;
  is_default: boolean;
  status: string;
  store?: { id: number; code: string; name: string } | null;
}

export interface SupplierItem {
  id: number;
  code: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_id: string | null;
  payment_terms_days: number;
  balance: string;
  is_active: boolean;
}

export interface CustomerItem {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  customer_type: "walk_in" | "registered" | "member" | "wholesale";
  loyalty_points: number;
  credit_limit: string;
  balance: string;
  is_active: boolean;
}

export interface ProductVariantItem {
  id: number;
  sku: string;
  name: string;
  purchase_price?: string;
  average_cost?: string;
  selling_price: string;
  wholesale_price: string | null;
  min_selling_price: string;
  is_active: boolean;
  barcodes?: Array<{ id: number; barcode: string; is_primary: boolean }>;
}

export interface ProductItem {
  id: number;
  product_type: "standard" | "variant" | "bundle" | "service" | "non_stock";
  name: string;
  description: string | null;
  image_path: string | null;
  track_inventory: boolean;
  is_active: boolean;
  category?: { id: number; code: string; name: string } | null;
  brand?: { id: number; code: string; name: string } | null;
  base_unit?: { id: number; code: string; name: string } | null;
  tax?: { id: number; code: string; name: string; rate: string; type: string } | null;
  variants: ProductVariantItem[];
}

export interface InventoryStockItem {
  id: number;
  warehouse_id: number;
  product_variant_id: number;
  qty_on_hand: string;
  qty_reserved: string;
  qty_available: string;
  unit_cost?: string;
  valuation?: string;
  warehouse?: { id: number; code: string; name: string } | null;
  variant?: {
    id: number;
    sku: string;
    name: string;
    min_stock: string;
    reorder_point: string;
  } | null;
  batch?: { id: number; batch_number: string; expired_at: string | null } | null;
}

export interface StockMovementItem {
  id: number;
  movement_type: string;
  qty_before: string;
  qty_change: string;
  qty_after: string;
  unit_cost: string;
  notes: string | null;
  warehouse?: { id: number; code: string; name: string } | null;
  variant?: { id: number; sku: string; name: string } | null;
  created_at: string;
}

export interface StockAdjustmentItem {
  id: number;
  adjustment_number: string;
  reason: string;
  status: string;
  warehouse?: { id: number; code: string; name: string } | null;
  items?: Array<{ id: number; sku: string | null; direction: string; quantity: string }>;
  created_at: string;
}

export interface StockTransferItem {
  id: number;
  transfer_number: string;
  status: string;
  from_warehouse?: { id: number; code: string; name: string } | null;
  to_warehouse?: { id: number; code: string; name: string } | null;
  items?: Array<{ id: number; sku: string | null; quantity: string }>;
  created_at: string;
}

export interface ExpiredBatchAlert {
  id: number;
  batch_number: string;
  expired_at: string | null;
  is_expired: boolean;
  sku: string | null;
  variant_name: string | null;
}

export interface PurchaseOrderSummary {
  id: number;
  po_number: string;
  order_date: string;
  grand_total: string;
  status: string;
  supplier?: { id: number; company_name: string } | null;
  warehouse?: { id: number; name: string } | null;
}

export interface GoodsReceiptSummary {
  id: number;
  grn_number: string;
  status: string;
  received_at: string;
  purchase_order?: { id: number; po_number: string } | null;
  warehouse?: { id: number; name: string } | null;
}

export interface PurchaseInvoiceSummary {
  id: number;
  invoice_number: string;
  supplier_invoice_number: string | null;
  due_date: string;
  grand_total: string;
  paid_amount: string;
  payment_status: string;
  supplier?: { id: number; company_name: string } | null;
}

export interface PurchaseReturnSummary {
  id: number;
  return_number: string;
  credit_note_no: string | null;
  reason: string;
  total_amount: string;
  status: string;
  supplier?: { id: number; company_name: string } | null;
}

export interface PaymentMethodItem {
  id: number;
  code: string;
  name: string;
  type: string;
}

export interface SaleItemSummary {
  id: number;
  product_variant_id: number;
  sku_snapshot: string;
  product_name_snapshot: string;
  quantity: string;
  unit_price_snapshot: string;
  line_total: string;
  return_items?: Array<{ id: number; quantity: string; condition: string }>;
}

export interface SaleSummary {
  id: number;
  transaction_number: string;
  status: string;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  grand_total: string;
  paid_total: string;
  change_amount: string;
  completed_at: string | null;
  created_at: string;
  customer?: { id: number; name: string } | null;
  cashier?: { id: number; name: string } | null;
  items?: SaleItemSummary[];
}

export interface SaleReturnSummary {
  id: number;
  return_number: string;
  type: string;
  reason: string;
  refund_amount: string;
  status: string;
  created_at: string;
  sale?: { id: number; transaction_number: string } | null;
  refund_method?: { id: number; name: string } | null;
  creator?: { id: number; name: string } | null;
  items?: Array<{
    id: number;
    quantity: string;
    refund_subtotal: string;
    condition: string;
    sale_item?: { sku_snapshot: string; product_name_snapshot: string } | null;
  }>;
}

export interface ReceiptPayload {
  paper_size: "58mm" | "80mm";
  transaction_number: string;
  grand_total: string;
  paid_total: string;
  change_amount: string;
  thermal_text: string;
}

export interface CashRegister {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
}

export interface CashRegisterMovement {
  id: number;
  type: "cash_in" | "cash_out" | "cash_expense" | "cash_adjustment";
  amount: string;
  reason: string;
  created_at: string;
  creator?: { id: number; name: string } | null;
}

export interface CashRegisterSession {
  id: number;
  cash_register_id: number;
  opened_at: string;
  closed_at: string | null;
  opening_balance: string;
  expected_cash: string;
  actual_cash: string | null;
  cash_difference: string | null;
  status: "open" | "closed";
  closing_notes: string | null;
  register?: CashRegister | null;
  user?: { id: number; name: string } | null;
  movements?: CashRegisterMovement[];
}

export interface CashReconciliationSummary {
  opening_balance: string;
  cash_sales: string;
  cash_in: string;
  cash_out: string;
  cash_refund: string;
  cash_expense: string;
  cash_adjustment: string;
  expected_cash: string;
  actual_cash: string | null;
  cash_difference: string | null;
  reconciliation_status: "open" | "balanced" | "overage" | "shortage";
}

export interface CurrentRegisterPayload {
  session: CashRegisterSession;
  summary: CashReconciliationSummary;
}

export interface ExpenseCategory {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface ExpenseItem {
  id: number;
  expense_number: string;
  expense_date: string;
  amount: string;
  description: string;
  attachment_path: string | null;
  status: "draft" | "pending_approval" | "approved" | "rejected";
  rejection_reason: string | null;
  category?: ExpenseCategory | null;
  payment_method?: PaymentMethodItem | null;
  creator?: { id: number; name: string } | null;
  approver?: { id: number; name: string } | null;
}

export interface PromotionItem {
  id: number;
  code: string;
  name: string;
  type: string;
  priority: number;
  is_stackable: boolean;
  starts_at: string | null;
  ends_at: string | null;
  min_purchase: string;
  max_discount: string | null;
  usage_limit: number | null;
  usage_count: number;
  rules: Record<string, unknown>;
  is_active: boolean;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPayload {
  unread_count: number;
  items: NotificationItem[];
}

export interface DashboardPayload {
  role: "owner" | "manager" | "cashier";
  period: { from: string; to: string };
  kpis: Record<string, string | number | boolean>;
  daily_trend?: Array<{ date: string; revenue: string }>;
  top_products?: Array<{ sku: string; name: string; total_qty: string; total_revenue: string }>;
  recent_sales?: Array<{
    id: number;
    transaction_number: string;
    grand_total: string;
    status: string;
  }>;
}

export interface ReportPayload {
  report_type: string;
  period?: { from: string; to: string };
  summary: Record<string, string | number>;
  payment_breakdown?: Record<string, string>;
  expense_breakdown?: Record<string, string>;
  rows: Array<Record<string, string | number | boolean>>;
}

export interface ReportExportItem {
  id: number;
  report_type: string;
  format: string;
  status: string;
  file_path: string | null;
  created_at: string;
  completed_at: string | null;
}
