// src/hooks/useAdminAuth.ts
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminAuthApi } from '@/api/admin'
import { useAdminAuthStore } from '@/store/admin-auth.store'

export function useAdminAuth() {
  const store    = useAdminAuthStore()
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: adminAuthApi.login,
    onSuccess: (data) => {
      store.setSession({
        admin:        data.admin,
        accessToken:  data.accessToken,
        refreshToken: data.refreshToken,
      })
      navigate('/admin/dashboard')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Credenciales inválidas'
      toast.error(msg)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = store.refreshToken
      if (token) await adminAuthApi.logout(token)
    },
    onSettled: () => {
      store.clearSession()
      navigate('/admin/login')
    },
  })

  return {
    admin:     store.admin,
    isLoading: loginMutation.isPending,
    login:     loginMutation.mutate,
    logout:    logoutMutation.mutate,
  }
}
