// src/pages/dashboard/DashboardPage.tsx
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, ShoppingCart,
  AlertTriangle, DollarSign
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/badge'
import KpiCard from '@/components/ui/KpiCard'
import { reportsApi } from '@/api'
import { formatCurrency } from '@/lib/utils'

const PAYMENT_COLORS: Record<string, string> = {
  cash:     '#22c55e',
  card:     '#3b82f6',
  transfer: '#f59e0b',
  credit:   '#8b5cf6',
}
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Crédito',
}


export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  reportsApi.dashboard,
    refetchInterval: 60_000, // refrescar cada minuto
  })

  const glassCard = 'backdrop-blur-xl bg-slate-800/75 border border-white/10 shadow-2xl text-white'
  const tickStyle = { fill: 'rgba(255,255,255,0.55)', fontSize: 12 } as const
  const tooltipStyle = {
    contentStyle: { background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' },
    cursor: { fill: 'rgba(255,255,255,0.05)' },
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen de tus operaciones</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Ventas del día"
          value={data ? formatCurrency(data.today.amount) : '—'}
          subtitle={`${data?.today.sales ?? 0} transacciones`}
          icon={DollarSign}
          trend={data?.today.growthVsYesterday ?? null}
          loading={isLoading}
          color='green'
        />
        <KpiCard
          title="Ventas del mes"
          value={data ? formatCurrency(data.month.amount) : '—'}
          subtitle={`${data?.month.sales ?? 0} transacciones`}
          icon={TrendingUp}
          trend={data?.month.growthVsLastMonth ?? null}
          loading={isLoading}
          color='blue'
        />
        <KpiCard
          title="Descuentos del mes"
          value={data ? formatCurrency(data.month.discount) : '—'}
          icon={ShoppingCart}
          loading={isLoading}
          color='purple'
        />
        <KpiCard
          title="Productos con stock bajo"
          value={String(data?.lowStockCount ?? 0)}
          subtitle="Requieren reposición"
          icon={AlertTriangle}
          loading={isLoading}
          color='yellow'
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Métodos de pago hoy */}
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle className="text-base text-white">Pagos de hoy por método</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/10" />)}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.paymentMethods ?? []} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis
                    dataKey="method"
                    tickFormatter={(v) => PAYMENT_LABELS[v] ?? v}
                    tick={tickStyle}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tick={tickStyle}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Monto']}
                    labelFormatter={(l) => PAYMENT_LABELS[l] ?? l}
                    {...tooltipStyle}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
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
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle className="text-base text-white">Productos más vendidos hoy</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/10" />)}
              </div>
            ) : (data?.topProducts ?? []).length === 0 ? (
              <p className="text-sm text-white/50 text-center py-8">Sin ventas hoy</p>
            ) : (
              <div className="space-y-3">
                {(data?.topProducts ?? []).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <span className="text-xs font-bold text-white/30 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-white">{item.product?.name ?? '—'}</p>
                      <p className="text-xs text-white/50">{item.quantity} {item.product?.unit}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas de stock bajo */}
      {(data?.lowStockCount ?? 0) > 0 && (
        <Card className="backdrop-blur-xl bg-yellow-500/20 border border-yellow-400/30 shadow-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-yellow-400" />
              <CardTitle className="text-base text-yellow-200">Alerta de inventario</CardTitle>
              <Badge variant="warning">{data?.lowStockCount} producto(s)</Badge>
            </div>
            <CardDescription className="text-yellow-300/80">
              Tienes productos con stock por debajo del mínimo configurado.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
