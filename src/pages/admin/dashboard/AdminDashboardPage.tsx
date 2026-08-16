// src/pages/admin/dashboard/AdminDashboardPage.tsx
import { useAdminAuth } from '@/hooks/useAdminAuth'

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900">Hola, {admin?.fullName}</h1>
      <p className="text-slate-500 mt-1">Panel de administración de la plataforma.</p>
    </div>
  )
}
