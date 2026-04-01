// src/api/index.ts
// Funciones de API organizadas por módulo.
// Cada función retorna los datos ya extraídos del wrapper { success, data }.

import api from '../lib/axios';
import type {
  LoginResponse, AuthUser, Product, Sale, Customer,
  Supplier, User, InventoryMovement, DashboardData,
  PaginationMeta, Plan, Subscription, Branch, Role, Category,
} from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

function unwrapPaginated<T>(
  response: { data: { data: T[]; meta: PaginationMeta } },
): { data: T[]; meta: PaginationMeta } {
  return { data: response.data.data, meta: response.data.meta }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (params: { email: string; password: string; tenantSlug: string }) =>
    unwrap<LoginResponse>(await api.post('/auth/login', params)),

  register: async (params: {
    tenantName: string; tenantSlug: string
    ownerName: string; ownerEmail: string; ownerPassword: string
    planCode?: string
  }) => unwrap<{ tenantId: string; userId: string }>(await api.post('/auth/register', params)),

  refresh: async (refreshToken: string) =>
    unwrap<{ accessToken: string }>(await api.post('/auth/refresh', { refreshToken })),

  logout: async (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: async () => unwrap<AuthUser>(await api.get('/auth/me')),

  pinLogin: async (params: { pin: string; tenantSlug: string }) =>
    unwrap<{ accessToken: string; user: Pick<AuthUser, 'id' | 'fullName' | 'role'> }>(
      await api.post('/auth/pin', params),
    ),
}

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsApi = {
  list: async (params?: {
    page?: number; limit?: number; search?: string
    category_id?: string; low_stock?: boolean; is_active?: boolean
    sortBy?: string; sortOrder?: 'asc' | 'desc'
  }) => unwrapPaginated<Product>(await api.get('/products', { params })),

  getById: async (id: string) =>
    unwrap<Product>(await api.get(`/products/${id}`)),

  getByBarcode: async (barcode: string) =>
    unwrap<Product>(await api.get(`/products/barcode/${encodeURIComponent(barcode)}`)),

  getLowStock: async () =>
    unwrap<Product[]>(await api.get('/products/low-stock')),

  create: async (data: Partial<Product>) =>
    unwrap<Product>(await api.post('/products', data)),

  update: async (id: string, data: Partial<Product>) =>
    unwrap<Product>(await api.put(`/products/${id}`, data)),

  delete: async (id: string) =>
    unwrap<{ message: string }>(await api.delete(`/products/${id}`)),

  importCsv: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return unwrap<{ message: string; created: number; updated: number; errors: string[] }>(
      await api.post('/products/import/csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
  },
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export const salesApi = {
  list: async (params?: {
    page?: number; limit?: number
    from?: string; to?: string
    branch_id?: string; status?: string
  }) => unwrapPaginated<Sale>(await api.get('/sales', { params })),

  getById: async (id: string) =>
    unwrap<Sale>(await api.get(`/sales/${id}`)),

  create: async (data: {
    branch_id: string
    customer_id?: string
    items: Array<{ product_id: string; quantity: number; unit_price: number; discount?: number }>
    payments: Array<{ method: string; amount: number; change_given?: number; stripe_payment_id?: string }>
    discount?: number
    notes?: string
  }) => unwrap<Sale>(await api.post('/sales', data)),

  cancel: async (id: string, reason: string) =>
    unwrap<{ message: string }>(await api.post(`/sales/${id}/cancel`, { reason })),

  summaryToday: async () =>
    unwrap<{ totalSales: number; totalAmount: number; byMethod: Array<{ method: string; amount: number }> }>(
      await api.get('/sales/summary/today'),
    ),
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryApi = {
  movements: async (params?: {
    page?: number; limit?: number
    product_id?: string; type?: string; from?: string; to?: string
  }) => unwrapPaginated<InventoryMovement>(await api.get('/inventory/movements', { params })),

  adjust: async (data: {
    product_id: string; delta: number
    type: 'purchase' | 'adjustment' | 'loss'
    reason: string; branch_id?: string
  }) => unwrap<InventoryMovement>(await api.post('/inventory/adjust', data)),
}

// ─── Customers ────────────────────────────────────────────────────────────────

export const customersApi = {
  list: async (params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) =>
    unwrapPaginated<Customer>(await api.get('/customers', { params })),

  getById: async (id: string) =>
    unwrap<Customer & { stats: { totalPurchases: number; totalSpent: number } }>(
      await api.get(`/customers/${id}`),
    ),

  create: async (data: Partial<Customer>) =>
    unwrap<Customer>(await api.post('/customers', data)),

  update: async (id: string, data: Partial<Customer>) =>
    unwrap<Customer>(await api.put(`/customers/${id}`, data)),

  delete: async (id: string) =>
    unwrap<{ message: string }>(await api.delete(`/customers/${id}`)),

  redeemPoints: async (id: string, points: number) =>
    unwrap<{ pointsRedeemed: number; remainingPoints: number; discountValue: number }>(
      await api.post(`/customers/${id}/redeem-points`, { points }),
    ),
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const suppliersApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }) =>
    unwrapPaginated<Supplier>(await api.get('/suppliers', { params })),

  getById: async (id: string) =>
    unwrap<Supplier & { products: Product[]; purchase_orders: object[] }>(
      await api.get(`/suppliers/${id}`),
    ),

  create: async (data: Partial<Supplier>) =>
    unwrap<Supplier>(await api.post('/suppliers', data)),

  update: async (id: string, data: Partial<Supplier>) =>
    unwrap<Supplier>(await api.put(`/suppliers/${id}`, data)),

  delete: async (id: string) =>
    unwrap<{ message: string }>(await api.delete(`/suppliers/${id}`)),
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: async (params?: { search?: string }) =>
    unwrap<User[]>(await api.get('/users', { params })),

  getById: async (id: string) =>
    unwrap<User>(await api.get(`/users/${id}`)),

  create: async (data: {
    email: string; password: string; full_name: string
    role_id: string; branch_id?: string
  }) => unwrap<User>(await api.post('/users', data)),

  update: async (id: string, data: Partial<User & { role_id: string }>) =>
    unwrap<User>(await api.put(`/users/${id}`, data)),

  delete: async (id: string) =>
    unwrap<{ message: string }>(await api.delete(`/users/${id}`)),

  setPin: async (id: string, pin: string | null) =>
    unwrap<{ message: string }>(await api.put(`/users/${id}/pin`, { pin })),

  changePassword: async (params: { current_password: string; new_password: string }) =>
    unwrap<{ message: string }>(await api.put('/users/me/password', params)),

  roles: async () =>
    unwrap<Role[]>(await api.get('/users/roles')),
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportsApi = {
  dashboard: async () =>
    unwrap<DashboardData>(await api.get('/reports/dashboard')),

  sales: async (params: { from: string; to: string; branch_id?: string }) =>
    unwrap<object>(await api.get('/reports/sales', { params })),

  products: async (params: { from: string; to: string; limit?: number }) =>
    unwrap<object[]>(await api.get('/reports/products', { params })),

  cashCut: async (params: { from: string; to: string; branch_id?: string }) =>
    unwrap<object>(await api.get('/reports/cash-cut', { params })),

  inventoryValue: async () =>
    unwrap<{ items: object[]; totals: object }>(await api.get('/reports/inventory-value')),
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptionsApi = {
  plans: async () =>
    unwrap<Plan[]>(await api.get('/subscriptions/plans')),

  current: async () =>
    unwrap<{ subscription: Subscription; plan: Plan; usage: object }>(
      await api.get('/subscriptions/current'),
    ),

  checkout: async (params: { plan_code: string; success_url: string; cancel_url: string }) =>
    unwrap<{ checkoutUrl: string }>(await api.post('/subscriptions/checkout', params)),

  portal: async (params: { return_url: string }) =>
    unwrap<{ portalUrl: string }>(await api.post('/subscriptions/portal', params)),

  cancel: async () =>
    unwrap<{ message: string; endsAt: string }>(await api.post('/subscriptions/cancel')),
}

// ─── Branches / Categories ────────────────────────────────────────────────────

export const branchesApi = {
  list: async () => unwrap<Branch[]>(await api.get('/users')),
}

export const categoriesApi = {
  list: async () =>
    unwrap<Category[]>(await api.get('/products/categories').catch(() => ({ data: { data: [] } }))),
}
