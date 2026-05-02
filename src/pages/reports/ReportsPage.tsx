// src/pages/reports/ReportsPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { DollarSign, Receipt, TrendingUp, Tag, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import { reportsApi } from "@/api";
import { formatCurrency, cn } from "@/lib/utils";
import { CashCutData, ProductReportItem, SalesReportData } from "@/types";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  credit: "Crédito",
};
const PAYMENT_COLORS: Record<string, string> = {
  cash: "#22c55e",
  card: "#3b82f6",
  transfer: "#f59e0b",
  credit: "#8b5cf6",
};

const glassCard =
  "backdrop-blur-xl bg-slate-800/75 border border-white/10 shadow-2xl text-white";
const tickStyle = { fill: "rgba(255,255,255,0.55)", fontSize: 11 } as const;
const tooltipStyle = {
  contentStyle: {
    background: "rgba(15,23,42,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    color: "#fff",
  },
  cursor: { stroke: "rgba(255,255,255,0.08)" },
};

export default function ReportsPage() {
  const now = new Date();
  const [from, setFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"));

  const { data: salesData, isLoading: salesLoading } = useQuery<SalesReportData>({
    queryKey: ["report-sales", from, to],
    queryFn: () => reportsApi.sales({ from, to }) as Promise<SalesReportData>,
    enabled: !!from && !!to,
  })

  const { data: productsData, isLoading: productsLoading } = useQuery<ProductReportItem[]>({
    queryKey: ["report-products", from, to],
    queryFn: () => reportsApi.products({ from, to, limit: 10 }) as Promise<ProductReportItem[]>,
    enabled: !!from && !!to,
  })

  const today = format(now, "yyyy-MM-dd");
  const { data: cashCutData, isLoading: cashCutLoading } = useQuery<CashCutData>({
    queryKey: ["cash-cut", today],
    queryFn: () => reportsApi.cashCut({ from: today, to: today }) as Promise<CashCutData>,
  })

  const summary = salesData?.summary;
  const byDay = (salesData?.byDay ?? []).map((d) => ({
    ...d,
    label: format(new Date(d.day + "T12:00:00"), "dd MMM", { locale: es }),
  }));

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Reportes"
        description="Análisis de ventas e inventario"
      />

      {/* Selector de período */}
      <div className="backdrop-blur-xl bg-white/80 border border-white/50 rounded-xl p-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-slate-500" />
            <span className="text-sm text-slate-600 font-medium">Desde</span>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40 border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-slate-500" />
            <span className="text-sm text-slate-600 font-medium">Hasta</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40 border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFrom(format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"));
                setTo(format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd"));
              }}
              className="border-slate-200 hover:bg-slate-100"
            >
              Mes anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFrom(format(startOfMonth(now), "yyyy-MM-dd"));
                setTo(format(endOfMonth(now), "yyyy-MM-dd"));
              }}
              className="border-slate-200 hover:bg-slate-100"
            >
              Este mes
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="cashcut">Corte de caja</TabsTrigger>
        </TabsList>

        {/* ── Tab: Ventas ──────────────────────────────────────────────────────── */}
        <TabsContent value="sales" className="space-y-6 mt-4">
          {/* KPIs de resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Total de ventas"
              value={summary ? formatCurrency(summary.totalRevenue) : "—"}
              icon={DollarSign}
              color="green"
              loading={salesLoading}
            />
            <KpiCard
              title="Transacciones"
              value={summary ? String(summary.totalSales) : "—"}
              icon={Receipt}
              color="blue"
              loading={salesLoading}
            />
            <KpiCard
              title="Ticket promedio"
              value={summary ? formatCurrency(summary.avgTicket) : "—"}
              icon={TrendingUp}
              color="indigo"
              loading={salesLoading}
            />
            <KpiCard
              title="Descuentos"
              value={summary ? formatCurrency(summary.totalDiscount) : "—"}
              icon={Tag}
              color="purple"
              loading={salesLoading}
            />
          </div>

          {/* Gráfica de ventas por día */}
          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="text-base text-white">
                Ventas por día
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <Skeleton className="h-56 w-full bg-white/10" />
              ) : byDay.length === 0 ? (
                <p className="text-center text-sm text-white/50 py-16">
                  Sin datos en el período
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={byDay}
                    margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.07)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={tickStyle}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      tick={tickStyle}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => {
                        if (v === undefined) return ["$0", "Ventas"];
                        return [formatCurrency(v as number), "Ventas"];
                      }}
                      {...tooltipStyle}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#818cf8"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#818cf8" }}
                      activeDot={{ r: 5, fill: "#6366f1" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Desglose por cajero y método de pago */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por método de pago */}
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle className="text-base text-white">
                  Por método de pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full bg-white/10" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(salesData?.byPaymentMethod ?? []).map((pm: any) => {
                      const pct = summary?.totalRevenue
                        ? (pm.amount / summary.totalRevenue) * 100
                        : 0;
                      return (
                        <div key={pm.method} className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-white">
                              {PAYMENT_LABELS[pm.method] ?? pm.method}
                            </span>
                            <span className="text-white">
                              {formatCurrency(pm.amount)}
                            </span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor:
                                  PAYMENT_COLORS[pm.method] ?? "#6b7280",
                              }}
                            />
                          </div>
                          <p className="text-xs text-white/50">
                            {pm.count} transacciones · {pct.toFixed(1)}%
                          </p>
                        </div>
                      );
                    })}
                    {(salesData?.byPaymentMethod ?? []).length === 0 && (
                      <p className="text-sm text-white/50 text-center py-6">
                        Sin datos
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Por cajero */}
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle className="text-base text-white">
                  Por cajero
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full bg-white/10" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {(salesData?.byCashier ?? []).map((c: any, i: number) => (
                      <div
                        key={c.userId}
                        className="flex items-center gap-3 py-2.5 border-b border-white/10 last:border-0"
                      >
                        <span className="text-xs font-bold text-white/30 w-4">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-white">
                            {c.userName}
                          </p>
                          <p className="text-xs text-white/50">
                            {c.sales} ventas
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-400">
                          {formatCurrency(c.total)}
                        </span>
                      </div>
                    ))}
                    {(salesData?.byCashier ?? []).length === 0 && (
                      <p className="text-sm text-white/50 text-center py-6">
                        Sin datos
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Productos ───────────────────────────────────────────────────── */}
        <TabsContent value="products" className="mt-4">
          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="text-base text-white">
                Top 10 productos más vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full bg-white/10" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {(productsData ?? []).map((item: any, i: number) => (
                    <div
                      key={item.product?.id ?? i}
                      className="grid grid-cols-[2rem_1fr_auto_auto_auto] items-center gap-3 py-3 border-b border-white/10 last:border-0"
                    >
                      <span className="text-xs font-bold text-white/30 text-center">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-white">
                          {item.product?.name ?? "—"}
                        </p>
                        <p className="text-xs text-white/50">
                          {item.quantity} {item.product?.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {formatCurrency(item.revenue)}
                        </p>
                        <p className="text-xs text-white/50">Ingresos</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            item.profit >= 0
                              ? "text-emerald-400"
                              : "text-red-400",
                          )}
                        >
                          {formatCurrency(item.profit)}
                        </p>
                        <p className="text-xs text-white/50">Ganancia</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {item.margin.toFixed(1)}%
                        </p>
                        <p className="text-xs text-white/50">Margen</p>
                      </div>
                    </div>
                  ))}
                  {(productsData ?? []).length === 0 && (
                    <p className="text-sm text-white/50 text-center py-12">
                      Sin datos en el período
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Corte de caja ───────────────────────────────────────────────── */}
        <TabsContent value="cashcut" className="mt-4 space-y-4">
          <Card className={glassCard}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base text-white">
                Corte de caja — Hoy
              </CardTitle>
              <Badge
                variant="secondary"
                className="font-mono text-xs bg-white/10 text-white/70 border-white/10"
              >
                {format(now, "dd/MM/yyyy HH:mm")}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              {cashCutLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full bg-white/10" />
                  ))}
                </div>
              ) : cashCutData ? (
                <>
                  {/* Mini KPIs del corte */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      {
                        label: "Ventas realizadas",
                        value: String(cashCutData.totalSales),
                        color: "text-white",
                      },
                      {
                        label: "Ingresos totales",
                        value: formatCurrency(cashCutData.totalRevenue),
                        color: "text-white",
                      },
                      {
                        label: "Efectivo en caja",
                        value: formatCurrency(cashCutData.cashInDrawer),
                        color: "text-emerald-400",
                      },
                      {
                        label: "Cancelaciones",
                        value: String(cashCutData.totalCancellations),
                        color: "text-red-400",
                      },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        className="rounded-xl bg-white/5 border border-white/10 p-4"
                      >
                        <p className="text-xs text-white/50">{label}</p>
                        <p className={cn("text-xl font-bold mt-1", color)}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Desglose por método */}
                  <div>
                    <p className="text-sm font-medium text-white/70 mb-3">
                      Desglose por método de pago
                    </p>
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="text-left p-3 font-medium text-white/60">
                              Método
                            </th>
                            <th className="text-right p-3 font-medium text-white/60">
                              Recibido
                            </th>
                            <th className="text-right p-3 font-medium text-white/60">
                              Cambio dado
                            </th>
                            <th className="text-right p-3 font-medium text-white/60">
                              Neto
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {cashCutData.byPaymentMethod.map((pm: any) => (
                            <tr
                              key={pm.method}
                              className="border-t border-white/10"
                            >
                              <td className="p-3 font-medium text-white">
                                {PAYMENT_LABELS[pm.method] ?? pm.method}
                              </td>
                              <td className="p-3 text-right text-white">
                                {formatCurrency(pm.received)}
                              </td>
                              <td className="p-3 text-right text-white/50">
                                {pm.change > 0
                                  ? `-${formatCurrency(pm.change)}`
                                  : "—"}
                              </td>
                              <td className="p-3 text-right font-semibold text-emerald-400">
                                {formatCurrency(pm.net)}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-white/20 bg-white/5 font-bold">
                            <td className="p-3 text-white">Total</td>
                            <td className="p-3 text-right text-white">
                              {formatCurrency(cashCutData.totalRevenue)}
                            </td>
                            <td className="p-3 text-right text-white/50">—</td>
                            <td className="p-3 text-right text-emerald-400">
                              {formatCurrency(cashCutData.cashInDrawer)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/50 text-center py-12">
                  Sin datos de caja para hoy
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
