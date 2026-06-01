// src/components/layout/AppLayout.tsx
import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, TrendingUp,
  Users, Truck, BarChart3, Settings, LogOut,
  Menu, Wifi, WifiOff,
  Barcode, ChevronLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { Toaster } from 'sonner'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  permission?: { resource: string; action: string }
  feature?: string
  badge?: number
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout, hasPermission, hasFeature } = useAuth()
  const { isOnline, pendingCount } = useOfflineSync()

  const navItems: NavItem[] = [
    { to: '/app/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/app/pos',         label: 'Vender', icon: ShoppingCart },
    { to: '/app/barcodes',    label: 'Códigos',  icon: Barcode },
    { to: '/app/inventory',   label: 'Inventario',   icon: Package,    permission: { resource: 'products',  action: 'read' } },
    { to: '/app/sales',       label: 'Ventas',       icon: TrendingUp, permission: { resource: 'sales',     action: 'read' } },
    { to: '/app/customers',   label: 'Clientes',     icon: Users,      permission: { resource: 'customers', action: 'read' }, feature: 'customers' },
    { to: '/app/suppliers',   label: 'Proveedores',  icon: Truck,      permission: { resource: 'suppliers', action: 'read' }, feature: 'suppliers' },
    { to: '/app/reports',     label: 'Reportes',     icon: BarChart3,  permission: { resource: 'reports',   action: 'view_sales' } },
    { to: '/app/settings',    label: 'Configuración',icon: Settings },
  ]

  const visibleItems = navItems.filter((item) => {
    if (item.permission && !hasPermission(item.permission.resource, item.permission.action)) return false
    if (item.feature && !hasFeature(item.feature as never)) return false
    return true
  })

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative">
      {/* Gradients */}
      <div className="absolute w-150 h-150 bg-indigo-600/20 rounded-full blur-3xl -top-40 -left-40 pointer-events-none" />
      <div className="absolute w-125 h-125 bg-cyan-500/20 rounded-full blur-3xl -bottom-32 -right-32 pointer-events-none" />

      {/* Sidebar */}
      <aside
        className={cn(
          'relative z-10 flex flex-col border-r border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-200',
          sidebarOpen ? 'w-60' : 'w-16',
        )}
      >
        {/* Logo + toggle */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          {sidebarOpen && (
            <span className="font-semibold text-lg truncate text-white">POS Atienda</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0 text-white/60 hover:text-white hover:bg-white/10"
          >
            {sidebarOpen ? <ChevronLeft className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl mx-2 transition-all',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-white/60 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <item.icon className="size-5 shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0">{item.badge}</Badge>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer: estado online + usuario */}
        <div className="border-t border-white/10 p-3 space-y-2">
          {/* Estado de red */}
          <div className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs',
            isOnline
              ? 'text-emerald-400 bg-emerald-400/10'
              : 'text-yellow-400 bg-yellow-400/10',
          )}>
            {isOnline ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {sidebarOpen && (
              <span>
                {isOnline
                  ? 'En línea'
                  : `Sin conexión${pendingCount > 0 ? ` · ${pendingCount} pend.` : ''}`}
              </span>
            )}
          </div>

          {/* Usuario */}
          {user && (
            <div className={cn('flex items-center gap-2 px-2', !sidebarOpen && 'justify-center')}>
              <div className="size-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-xs font-semibold text-indigo-300 shrink-0">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-white">{user.fullName}</p>
                  <p className="text-xs text-white/50 capitalize">{user.role}</p>
                </div>
              )}
              {sidebarOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logout()}
                  className="size-8 shrink-0 text-white/60 hover:text-white hover:bg-white/10"
                >
                  <LogOut className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden bg-slate-50 rounded-tl-2xl rounded-bl-2xl">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  )
}
