// src/store/admin-auth.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminUser } from '@/types/admin'

interface AdminAuthState {
  admin: AdminUser | null
  accessToken: string | null
  refreshToken: string | null

  setSession: (params: { admin: AdminUser; accessToken: string; refreshToken: string }) => void
  clearSession: () => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,
      refreshToken: null,

      setSession: ({ admin, accessToken, refreshToken }) => {
        // También sincronizar con localStorage para el interceptor de Axios
        localStorage.setItem('admin_access_token', accessToken)
        localStorage.setItem('admin_refresh_token', refreshToken)
        set({ admin, accessToken, refreshToken })
      },

      clearSession: () => {
        localStorage.removeItem('admin_access_token')
        localStorage.removeItem('admin_refresh_token')
        set({ admin: null, accessToken: null, refreshToken: null })
      },
    }),
    {
      name: 'pos-admin-auth',
      partialize: (state) => ({
        admin:        state.admin,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)
