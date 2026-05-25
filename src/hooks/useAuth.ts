// src/hooks/useAuth.ts
// Hooks de conveniencia para permisos y feature flags.

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi, subscriptionsApi } from '@/api'
import { toast } from 'sonner'
import type { FeatureKey } from '@/types'
import { useAuthStore } from '@/store/auth.store'

// Hook principal de auth con acciones
export function useAuth() {
  const store    = useAuthStore()
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      store.setSession({
        user: {
          id:          data.user.id,
          email:       data.user.email,
          fullName:    data.user.fullName ?? data.user.email,
          role:        data.user.role,
          roleName:    data.user.roleName,
          permissions: data.user.permissions,
          branchId:    data.user.branchId,
          tenantId:    data.user.tenantId,
        },
        accessToken:  data.accessToken,
        refreshToken: data.refreshToken,
        tenantSlug:   data.user.tenantSlug,
      })
      subscriptionsApi.current()
        .then(({ plan }) => store.setFeatures(plan.features))
        .catch(() => toast.error('No se pudieron cargar los permisos del plan. Recarga la página.'))
      navigate('/app/dashboard')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Credenciales incorrectas'
      toast.error(msg)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = store.refreshToken
      if (token) await authApi.logout(token)
    },
    onSettled: () => {
      store.clearSession()
      navigate('/auth/login')
    },
  })

  return {
    user:        store.user,
    isLoading:   loginMutation.isPending,
    login:       loginMutation.mutate,
    logout:      logoutMutation.mutate,
    hasPermission: store.hasPermission,
    hasFeature:  store.hasFeature,
    isOwner:     store.isOwner(),
    isManager:   store.isManager(),
    isCashier:   store.isCashier(),
  }
}

// Guard hook — redirige si no tiene el permiso
export function useRequirePermission(resource: string, action: string) {
  const { hasPermission } = useAuthStore()
  const navigate = useNavigate()
  const allowed = hasPermission(resource, action)
  if (!allowed) navigate('/app/dashboard')
  return allowed
}

// Guard hook — redirige si el plan no tiene el feature
export function useRequireFeature(key: FeatureKey) {
  const { hasFeature } = useAuthStore()
  const navigate = useNavigate()
  const allowed = hasFeature(key)
  if (!allowed) navigate('/app/settings/subscription')
  return allowed
}

// Selector simple para un permiso específico
export function useHasPermission(resource: string, action: string): boolean {
  return useAuthStore(useCallback((s) => s.hasPermission(resource, action), [resource, action]))
}

// Selector simple para un feature flag
export function useHasFeature(key: FeatureKey): boolean {
  return useAuthStore(useCallback((s) => s.hasFeature(key), [key]))
}
