// src/pages/dashboard/DashboardPage.tsx
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, ShoppingCart,
  AlertTriangle, DollarSign
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/badge'
import { reportsApi } from '@/api'
import { formatCurrency, formatGrowth, cn } from '@/lib/utils'

const PAYMENT_COLORS: Record<string, string> = {
  cash:     '#22c55e',
  card:     '#3b82f6',
  transfer: '#f59e0b',
  credit:   '#8b5cf6',
}
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Crédito',
}

function KpiCard({
  title, value, subtitle, icon: Icon, trend, loading,
}: {
  title: string; value: string; subtitle?: string
  icon: React.ElementType; trend?: number | null; loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="size-5 text-primary" />
          </div>
        </div>
        {trend !== undefined && trend !== null && (
          <div className={cn('flex items-center gap-1 mt-3 text-xs font-medium',
            trend >= 0 ? 'text-green-600' : 'text-red-600',
          )}>
            {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {formatGrowth(trend)} vs ayer
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  reportsApi.dashboard,
    refetchInterval: 60_000, // refrescar cada minuto
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen de operaciones de hoy</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Ventas hoy"
          value={data ? formatCurrency(data.today.amount) : '—'}
          subtitle={`${data?.today.sales ?? 0} transacciones`}
          icon={DollarSign}
          trend={data?.today.growthVsYesterday ?? null}
          loading={isLoading}
        />
        <KpiCard
          title="Ventas del mes"
          value={data ? formatCurrency(data.month.amount) : '—'}
          subtitle={`${data?.month.sales ?? 0} transacciones`}
          icon={TrendingUp}
          trend={data?.month.growthVsLastMonth ?? null}
          loading={isLoading}
        />
        <KpiCard
          title="Descuentos del mes"
          value={data ? formatCurrency(data.month.discount) : '—'}
          icon={ShoppingCart}
          loading={isLoading}
        />
        <KpiCard
          title="Productos con stock bajo"
          value={String(data?.lowStockCount ?? 0)}
          subtitle="Requieren reposición"
          icon={AlertTriangle}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Métodos de pago hoy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagos de hoy por método</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.paymentMethods ?? []} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis
                    dataKey="method"
                    tickFormatter={(v) => PAYMENT_LABELS[v] ?? v}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Monto']}
                    labelFormatter={(l) => PAYMENT_LABELS[l] ?? l}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {(data?.paymentMethods ?? []).map((entry) => (
                      <Cell key={entry.method} fill={PAYMENT_COLORS[entry.method] ?? '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top productos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productos más vendidos hoy</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (data?.topProducts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin ventas hoy</p>
            ) : (
              <div className="space-y-3">
                {(data?.topProducts ?? []).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product?.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} {item.product?.unit}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas de stock bajo */}
      {(data?.lowStockCount ?? 0) > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-yellow-600" />
              <CardTitle className="text-base text-yellow-800">Alerta de inventario</CardTitle>
              <Badge variant="warning">{data?.lowStockCount} producto(s)</Badge>
            </div>
            <CardDescription className="text-yellow-700">
              Tienes productos con stock por debajo del mínimo configurado.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
