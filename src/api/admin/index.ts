// src/api/admin/index.ts
// Funciones de API del panel SuperAdmin.
// Cada función retorna los datos ya extraídos del wrapper { success, data }.

import adminApi from '@/lib/admin-axios'
import type { AdminLoginResponse, Tenant, TenantInput } from '@/types/admin'
import type { Plan, PaginationMeta, TenantStatus } from '@/types'

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

function unwrapPaginated<T>(
  response: { data: { data: T[]; meta: PaginationMeta } },
): { data: T[]; meta: PaginationMeta } {
  return { data: response.data.data, meta: response.data.meta }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const adminAuthApi = {
  login: async (params: { email: string; password: string }) =>
    unwrap<AdminLoginResponse>(await adminApi.post('/admin/auth/login', params)),

  refresh: async (refreshToken: string) =>
    unwrap<{ accessToken: string }>(await adminApi.post('/admin/auth/refresh', { refreshToken })),

  logout: async (refreshToken: string) =>
    adminApi.post('/admin/auth/logout', { refreshToken }),
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export const adminPlansApi = {
  list: async () =>
    unwrap<Plan[]>(await adminApi.get('/admin/plans')),

  create: async (data: Partial<Plan>) =>
    unwrap<Plan>(await adminApi.post('/admin/plans', data)),

  update: async (id: string, data: Partial<Plan>) =>
    unwrap<Plan>(await adminApi.put(`/admin/plans/${id}`, data)),

  delete: async (id: string) =>
    unwrap<{ message: string }>(await adminApi.delete(`/admin/plans/${id}`)),
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const adminTenantsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string; status?: TenantStatus }) =>
    unwrapPaginated<Tenant>(await adminApi.get('/admin/tenants', { params })),

  getById: async (id: string) =>
    unwrap<Tenant>(await adminApi.get(`/admin/tenants/${id}`)),

  create: async (data: TenantInput) =>
    unwrap<Tenant>(await adminApi.post('/admin/tenants', data)),

  update: async (id: string, data: Partial<TenantInput>) =>
    unwrap<Tenant>(await adminApi.put(`/admin/tenants/${id}`, data)),

  delete: async (id: string) =>
    unwrap<{ message: string }>(await adminApi.delete(`/admin/tenants/${id}`)),
}
