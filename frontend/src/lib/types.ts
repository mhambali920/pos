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
