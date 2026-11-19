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
