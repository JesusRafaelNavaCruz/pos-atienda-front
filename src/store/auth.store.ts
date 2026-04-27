// src/store/auth.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, FeatureKey } from '@/types'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  tenantSlug: string | null
  features: Record<string, string>

  // Acciones
  setSession: (params: {
    user: AuthUser
    accessToken: string
    refreshToken: string
    tenantSlug: string
  }) => void
  setFeatures: (features: Record<string, string>) => void
  clearSession: () => void

  // Helpers de permisos
  hasPermission: (resource: string, action: string) => boolean
  hasFeature: (key: FeatureKey) => boolean
  isOwner: () => boolean
  isManager: () => boolean
  isCashier: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      tenantSlug: null,
      features: {},

      setSession: ({ user, accessToken, refreshToken, tenantSlug }) => {
        // También sincronizar con localStorage para el interceptor de Axios
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
        set({ user, accessToken, refreshToken, tenantSlug })
      },

      setFeatures: (features) => set({ features }),

      clearSession: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, accessToken: null, refreshToken: null, tenantSlug: null, features: {} })
      },

      hasPermission: (resource, action) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'owner') return true
        return user.permissions.includes(`${resource}:${action}`)
      },

      hasFeature: (key) => {
        const { user, features } = get()
        if (user?.role === 'owner') return true
        const value = features[key]
        return value !== undefined && value !== 'false' && value !== '0'
      },

      isOwner:   () => get().user?.role === 'owner',
      isManager: () => get().user?.role === 'manager',
      isCashier: () => get().user?.role === 'cashier',
    }),
    {
      name: 'pos-auth',
      // Solo persistir lo que necesitamos entre sesiones
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
        tenantSlug:   state.tenantSlug,
        features:     state.features,
      }),
    },
  ),
)
