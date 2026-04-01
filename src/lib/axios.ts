// src/lib/axios.ts
// Cliente HTTP centralizado con:
//   - Adjunta Bearer token automáticamente
//   - Refresh automático cuando el access token expira (401)
//   - Redirige a /auth/login si el refresh también falla
//   - Cola de requests pendientes durante el refresh (evita múltiples refreshes paralelos)

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ─── Manejo de cola durante refresh ──────────────────────────────────────────

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token!)
  })
  failedQueue = []
}

// ─── Request interceptor: adjunta el access token ────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response interceptor: refresh automático ────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Solo intentar refresh en 401 y si no se reintentó ya
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // Si ya hay un refresh en curso, encolar este request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          },
          reject,
        })
      })
    }

    original._retry = true
    isRefreshing = true

    const refreshToken = localStorage.getItem('refresh_token')

    if (!refreshToken) {
      clearSession()
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
      const newToken = data.data.accessToken

      localStorage.setItem('access_token', newToken)
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`

      processQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearSession()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

function clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('auth_user')
  // Redirigir sin React Router para garantizar limpieza total
  window.location.href = '/auth/login'
}

export default api
