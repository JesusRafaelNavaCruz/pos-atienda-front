// src/types/index.ts
// Tipos alineados 1:1 con el backend (Prisma enums + API response shapes)

// ─── Enums (espejo de prisma/schema.prisma) ───────────────────────────────────

export type ProductUnit =
  | "pza"
  | "kg"
  | "g"
  | "lt"
  | "ml"
  | "caja"
  | "paq"
  | "rollo"
  | "par";
export type SaleStatus = "pending" | "completed" | "canceled" | "returned";
export type PaymentMethod = "cash" | "card" | "transfer" | "credit";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type InventoryMovementType =
  | "sale"
  | "purchase"
  | "adjustment"
  | "return"
  | "loss"
  | "initial";
export type PurchaseOrderStatus = "draft" | "sent" | "received" | "canceled";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";
export type TenantStatus = "active" | "suspended" | "canceled" | "trial";

export type FeatureKey =
  | "card_payments"
  | "csv_import"
  | "scale"
  | "thermal_printer"
  | "multi_branch"
  | "advanced_reports"
  | "api_access"
  | "suppliers"
  | "customers"
  | "stock_alerts"
  | "basic_reports";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleName: string;
  permissions: string[]; // formato: 'resource:action'
  branchId: string | null;
  tenantId: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    roleName: string;
    permissions: string[];
    branchId: string | null;
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  };
}

// ─── Entidades ────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  is_system: boolean;
  created_at: string;
  permissions?: RolePermission[];
  _count?: { users: number };
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  permission: Permission;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  role: Pick<Role, "id" | "name" | "code">;
  branch: Pick<Branch, "id" | "name"> | null;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  rfc: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: { products: number; purchase_orders: number };
}

export interface Product {
  id: string;
  tenant_id: string;
  category_id: string | null;
  supplier_id: string | null;
  barcode: string | null;
  sku: string | null;
  name: string;
  description: string | null;
  unit: ProductUnit;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  sold_by_weight: boolean;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Pick<Category, "id" | "name" | "color"> | null;
  supplier?: Pick<Supplier, "id" | "name"> | null;
}

export interface InventoryMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  user_id: string | null;
  branch_id: string | null;
  type: InventoryMovementType;
  quantity_before: number;
  quantity_after: number;
  delta: number;
  reason: string | null;
  reference_id: string | null;
  created_at: string;
  product?: Pick<Product, "name" | "barcode" | "unit">;
  user?: { full_name: string } | null;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  rfc: string | null;
  address: string | null;
  credit_limit: number;
  credit_balance: number;
  loyalty_points: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: { sales: number };
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  product?: Pick<Product, "name" | "barcode" | "unit">;
}

export interface Payment {
  id: string;
  sale_id: string;
  tenant_id: string;
  method: PaymentMethod;
  amount: number;
  change_given: number;
  stripe_payment_id: string | null;
  card_last4: string | null;
  card_brand: string | null;
  status: PaymentStatus;
  created_at: string;
}

export interface Sale {
  id: string;
  tenant_id: string;
  branch_id: string;
  user_id: string;
  customer_id: string | null;
  folio: string;
  subtotal: number;
  discount: number;
  total: number;
  status: SaleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: { full_name: string };
  customer?: { name: string } | null;
  branch?: { name: string };
  items?: SaleItem[];
  payments?: Payment[];
  _count?: { items: number };
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  supplier_id: string;
  user_id: string | null;
  branch_id: string | null;
  folio: string;
  status: PurchaseOrderStatus;
  total: number;
  notes: string | null;
  expected_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Pick<Supplier, "name">;
}

export interface Plan {
  id: string;
  name: string;
  code: string;
  price_mxn: number;
  billing_interval: "monthly" | "yearly";
  max_users: number;
  max_branches: number;
  trial_days: number;
  features: Record<FeatureKey, string>;
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  canceledAt: string | null;
}

// ─── API Response wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── POS: carrito ─────────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

// export interface DashboardData {
//   today: {
//     sales: number;
//     amount: number;
//     growthVsYesterday: number | null;
//   };
//   month: {
//     sales: number;
//     amount: number;
//     discount: number;
//     growthVsLastMonth: number | null;
//   };
//   lowStockCount: number;
//   topProducts: Array<{
//     product: Pick<Product, "id" | "name" | "unit"> | undefined;
//     quantity: number;
//     revenue: number;
//   }>;
//   paymentMethods: Array<{ method: PaymentMethod; amount: number }>;
// }

export interface DashboardData {
  period: {
    label: string;
    from: string;
    to: string;
  };

  sales: {
    count: number;
    revenue: number;
    discount: number;
    growthVsPrevious: number;
  };

  avgTicket: {
    value: number;
    growthVsPrevious: number;
  };

  profit: {
    gross: number;
    margin: number;
    growthVsPrevious: number;
  };

  topProducts: {
    product: {
      id: string;
      name: string;
      unit: string;
    };

    quantity: number;
    revenue: number;
  }[];

  recentTransactions: {
    id: string;
    total: number;
    cashier: string;
    createdAt: string;
  }[];

  paymentMethods: {
    method: "cash" | "card" | "transfer" | "mixed";
    amount: number;
    count: number;
  }[];

  alerts: {
    lowStockCount: number;
  };
}

export interface SalesSummaryToday {
  totalSales: number;
  totalAmount: number;
  byMethod: Array<{ method: PaymentMethod; amount: number }>;
}

// Tipos definidos
export interface SalesSummary {
  totalRevenue: number;
  totalSales: number;
  avgTicket: number;
  totalDiscount: number;
}

export interface PaymentMethodData {
  method: string;
  amount: number;
  count: number;
}

export interface CashierData {
  userId: string;
  userName: string;
  sales: number;
  total: number;
}

export interface DailySalesData {
  day: string;
  total: number;
}

export interface SalesReportData {
  summary: SalesSummary;
  byDay: DailySalesData[];
  byPaymentMethod: PaymentMethodData[];
  byCashier: CashierData[];
}

export interface ProductReportItem {
  product: {
    id: string;
    name: string;
    unit: string;
  };
  quantity: number;
  revenue: number;
  profit: number;
  margin: number;
}

export interface PaymentMethodDetail {
  method: string;
  received: number;
  change: number;
  net: number;
}

export interface CashCutData {
  totalSales: number;
  totalRevenue: number;
  cashInDrawer: number;
  totalCancellations: number;
  byPaymentMethod: PaymentMethodDetail[];
}
