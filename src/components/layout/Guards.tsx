// src/components/layout/Guards.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useAdminAuthStore } from '@/store/admin-auth.store'
import type { FeatureKey } from '@/types'

// Requiere sesión activa de SuperAdmin
export function AdminAuthGuard() {
  const admin = useAdminAuthStore((s) => s.admin)
  if (!admin) return <Navigate to="/admin/login" replace />
  return <Outlet />
}

// Requiere que NO haya sesión de SuperAdmin (para /admin/login)
export function AdminGuestGuard() {
  const admin = useAdminAuthStore((s) => s.admin)
  if (admin) return <Navigate to="/admin/dashboard" replace />
  return <Outlet />
}

// Requiere sesión activa
export function AuthGuard() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/auth/login" replace />
  return <Outlet />
}

// Requiere que NO haya sesión (para /auth/login)
export function GuestGuard() {
  const user = useAuthStore((s) => s.user)
  if (user) return <Navigate to="/app/dashboard" replace />
  return <Outlet />
}

// Requiere permiso RBAC específico
interface PermissionGuardProps {
  resource: string
  action: string
  fallback?: React.ReactNode
}
export function PermissionGuard({ resource, action, fallback }: PermissionGuardProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  if (!hasPermission(resource, action)) {
    return fallback ? <>{fallback}</> : <Navigate to="/app/dashboard" replace />
  }
  return <Outlet />
}

// Requiere feature del plan activo
interface FeatureGuardProps { feature: FeatureKey }
export function FeatureGuard({ feature }: FeatureGuardProps) {
  const hasFeature = useAuthStore((s) => s.hasFeature)
  if (!hasFeature(feature)) return <Navigate to="/app/settings?tab=subscription" replace />
  return <Outlet />
}

// Componente inline para mostrar/ocultar UI según permiso
interface CanProps {
  resource: string
  action: string
  children: React.ReactNode
  fallback?: React.ReactNode
}
export function Can({ resource, action, children, fallback = null }: CanProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  return hasPermission(resource, action) ? <>{children}</> : <>{fallback}</>
}

// Componente inline para feature flags
interface FeatureProps { flag: FeatureKey; children: React.ReactNode; fallback?: React.ReactNode }
export function Feature({ flag, children, fallback = null }: FeatureProps) {
  const hasFeature = useAuthStore((s) => s.hasFeature)
  return hasFeature(flag) ? <>{children}</> : <>{fallback}</>
}
