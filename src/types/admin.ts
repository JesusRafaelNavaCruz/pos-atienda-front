// src/types/admin.ts
// Tipos del panel SuperAdmin (gestión de tenants, planes, roles y permisos)

import type { Plan, TenantStatus } from './index';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: AdminUser;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  owner_name: string | null;
  owner_email: string | null;
  plan: Pick<Plan, 'id' | 'name' | 'code'> | null;
  created_at: string;
  _count?: { users: number; branches: number };
}

export interface TenantInput {
  name: string;
  slug: string;
  plan_id: string;
  status: TenantStatus;
  owner_name?: string;
  owner_email?: string;
  owner_password?: string;
}
