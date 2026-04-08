// src/components/layout/AppLayout.tsx
import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingCart, Package, TrendingUp,
  Users, Truck, BarChart3, Settings, LogOut,
  Menu, X, Wifi, WifiOff
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
  // const navigate = useNavigate()

  const navItems: NavItem[] = [
    { to: '/app/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
    { to: '/app/pos',         label: 'Terminal POS', icon: ShoppingCart },
    { to: '/app/inventory',   label: 'Inventario',   icon: Package,     permission: { resource: 'products',  action: 'read' } },
    { to: '/app/sales',       label: 'Ventas',       icon: TrendingUp,  permission: { resource: 'sales',     action: 'read' } },
    { to: '/app/customers',   label: 'Clientes',     icon: Users,       permission: { resource: 'customers', action: 'read' }, feature: 'customers' },
    { to: '/app/suppliers',   label: 'Proveedores',  icon: Truck,       permission: { resource: 'suppliers', action: 'read' }, feature: 'suppliers' },
    { to: '/app/reports',     label: 'Reportes',     icon: BarChart3,   permission: { resource: 'reports',   action: 'view_sales' } },
    { to: '/app/settings',    label: 'Configuración',icon: Settings },
  ]

  const visibleItems = navItems.filter((item) => {
    if (item.permission && !hasPermission(item.permission.resource, item.permission.action)) return false
    if (item.feature && !hasFeature(item.feature as never)) return false
    return true
  })

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-200',
          sidebarOpen ? 'w-60' : 'w-16',
        )}
      >
        {/* Logo + toggle */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {sidebarOpen && (
            <span className="font-semibold text-lg truncate">POS Abarrotes</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            {sidebarOpen ? <X className="size-4" /> : <Menu className="size-4" />}
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
                  'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-md mx-2 transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
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
        <div className="border-t p-3 space-y-2">
          {/* Estado de red */}
          <div className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs',
            isOnline ? 'text-green-700 bg-green-50' : 'text-yellow-700 bg-yellow-50',
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
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
              )}
              {sidebarOpen && (
                <Button variant="ghost" size="icon" onClick={() => logout()} className="size-8 shrink-0">
                  <LogOut className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  )
}
