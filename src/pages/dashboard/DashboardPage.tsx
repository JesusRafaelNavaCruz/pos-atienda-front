// src/pages/dashboard/DashboardPage.tsx
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Skeleton } from "@/components/ui/badge";
import KpiCard from "@/components/ui/KpiCard";
import { reportsApi } from "@/api";
import { formatCurrency, formatGrowth } from "@/lib/utils";
import { NavLink } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const PAYMENT_COLORS: Record<string, string> = {
  cash: "#22c55e",
  card: "#3b82f6",
  transfer: "#f59e0b",
  credit: "#8b5cf6",
};
const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  credit: "Crédito",
};

const selectTriggerClass = `
flex h-11 min-w-[140px] items-center justify-between
rounded-xl border border-slate-300 bg-white
px-4 text-sm font-semibold text-slate-900
shadow-sm
transition-all duration-200
hover:border-slate-400 hover:bg-slate-50
focus:border-blue-500 focus:ring-4 focus:ring-blue-100
data-[placeholder]:text-slate-500
`;
const selectItemClass = `
relative flex w-full cursor-pointer select-none
items-center rounded-lg px-3 py-2
text-sm font-medium text-slate-700
outline-none transition-colors

hover:bg-slate-100
focus:bg-slate-100

data-[state=checked]:bg-blue-50
data-[state=checked]:text-blue-700
data-[state=checked]:font-semibold
`;

export default function DashboardPage() {
  const [period, setPeriod] = useState("month");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => reportsApi.dashboard({ period: period }),
    refetchInterval: 60_000, // refrescar cada minuto
  });

  const tickStyle = {
    fill: "#64748b",
    fontSize: 12,
  };
  const tooltipStyle = {
    contentStyle: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      color: "#0f172a",
      boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    },
    cursor: { fill: "rgba(148,163,184,0.08)" },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">
            Resumen de tus operaciones
          </p>
        </div>
        <div className="space-y-2">
          <Label className="mb-1.5 block text-sm font-semibold text-slate-700 text-right">
            Periodo
          </Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 min-w-32">
              <SelectItem className={selectItemClass} value="today">
                Hoy
              </SelectItem>
              <SelectItem className={selectItemClass} value="week">
                Semana
              </SelectItem>
              <SelectItem className={selectItemClass} value="month">
                Mes
              </SelectItem>
              <SelectItem className={selectItemClass} value="year">
                Año
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alertas de stock bajo */}
      {(data?.alerts.lowStockCount ?? 0) > 0 && (
        <Card className="border-0 bg-gradient-to-br from-yellow-500 to-amber-500 text-white shadow-sm">
          <CardContent className="flex items-start justify-between p-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-100">
                Productos con stock bajo
              </p>

              <div className="space-y-1">
                <h2 className="text-4xl font-bold tracking-tight">
                  {data?.alerts.lowStockCount}
                </h2>

                <p className="text-sm text-yellow-100/90">
                  Requieren reposición
                </p>
              </div>

              <NavLink
                to="/app/inventory"
                className="
                  mt-3 inline-flex h-9 items-center justify-center
                  rounded-md
                  bg-white/15
                  px-4
                  text-sm font-medium text-white
                  backdrop-blur-sm
                  transition-all
                  hover:bg-white/25
                  hover:scale-[1.02]
                  active:scale-[0.98]
                "
              >
                Ver productos
              </NavLink>
            </div>

            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/20">
              <AlertTriangle className="size-7 text-white" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <KpiCard
          title="Ventas por periodo"
          value={data ? formatCurrency(data.sales.revenue) : "—"}
          subtitle={`${data?.sales.count ?? 0} transacciones`}
          icon={DollarSign}
          trend={data?.sales.growthVsPrevious ?? null}
          loading={isLoading}
          color="green"
        />
        <KpiCard
          title="Ganancias"
          value={data ? formatCurrency(data.profit.gross) : "—"}
          subtitle={`${formatGrowth(data?.profit?.margin ?? null)}`}
          icon={TrendingUp}
          trend={data?.profit.growthVsPrevious ?? null}
          loading={isLoading}
          color="blue"
        />
        <KpiCard
          title="Ticket promedio"
          value={data ? formatCurrency(data.avgTicket.value) : "—"}
          trend={data?.avgTicket.growthVsPrevious ?? null}
          icon={ShoppingCart}
          loading={isLoading}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transacciones recientes */}
        <Card className="border-0 bg-white shadow-2xl rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Últimas transacciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full bg-white/10" />
                ))}
              </div>
            ) : (data?.recentTransactions ?? []).length === 0 ? (
              <p className="text-sm text-white/50 text-center py-8">
                Sin transacciones recientes
              </p>
            ) : (
              <div className="space-y-3">
                {(data?.recentTransactions ?? []).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.cashier ?? "—"}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top productos */}
        <Card className="border-0 bg-white shadow-2xl rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900">
              Productos más vendidos hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full bg-white/10" />
                ))}
              </div>
            ) : (data?.topProducts ?? []).length === 0 ? (
              <p className="text-sm text-white/50 text-center py-8">
                Sin ventas hoy
              </p>
            ) : (
              <div className="space-y-3">
                {(data?.topProducts ?? []).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.product?.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} {item.product?.unit}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Métodos de pago hoy */}
      <Card className="border-0 bg-white shadow-2xl rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base text-white">
            Pagos de hoy por método
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-white/10" />
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={data?.paymentMethods ?? []}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <XAxis
                  dataKey="method"
                  tickFormatter={(v) => PAYMENT_LABELS[v] ?? v}
                  tick={tickStyle}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                      maximumFractionDigits: 0,
                      notation: v >= 1000 ? "compact" : "standard",
                    }).format(v)
                  }
                  tick={tickStyle}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => {
                    if (v === undefined) return ["$0", "Monto"];
                    return [formatCurrency(v as number), "Monto"];
                  }}
                  labelFormatter={(l) => PAYMENT_LABELS[l] ?? l}
                  {...tooltipStyle}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {(data?.paymentMethods ?? []).map((entry) => (
                    <Cell
                      key={entry.method}
                      fill={PAYMENT_COLORS[entry.method] ?? "#6b7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
