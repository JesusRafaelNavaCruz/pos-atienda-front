// src/components/layout/AdminLayout.tsx
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, CreditCard, ShieldCheck, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Toaster } from 'sonner'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/admin/tenants',   label: 'Tenants',    icon: Building2 },
  { to: '/admin/plans',     label: 'Planes',     icon: CreditCard },
  { to: '/admin/roles',     label: 'Roles',      icon: ShieldCheck },
]

export function AdminLayout() {
  const { admin, logout } = useAdminAuth()

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative">
      <div className="absolute w-150 h-150 bg-rose-600/20 rounded-full blur-3xl -top-40 -left-40 pointer-events-none" />
      <div className="absolute w-125 h-125 bg-amber-500/20 rounded-full blur-3xl -bottom-32 -right-32 pointer-events-none" />

      <aside className="relative z-10 flex flex-col w-60 border-r border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="flex h-16 items-center px-4 border-b border-white/10">
          <span className="font-semibold text-lg truncate text-white">SuperAdmin</span>
        </div>

        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl mx-2 transition-all',
                  isActive
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                    : 'text-white/60 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <item.icon className="size-5 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          {admin && (
            <div className="flex items-center gap-2 px-2">
              <div className="size-8 rounded-full bg-rose-600/30 flex items-center justify-center text-xs font-semibold text-rose-300 shrink-0">
                {admin.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-white">{admin.fullName}</p>
                <p className="text-xs text-white/50 truncate">{admin.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                className="size-8 shrink-0 text-white/60 hover:text-white hover:bg-white/10"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      <main className="relative z-10 flex-1 flex flex-col overflow-hidden bg-slate-50 rounded-tl-2xl rounded-bl-2xl">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  )
}
