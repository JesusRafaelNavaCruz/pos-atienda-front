// src/pages/sales/SalesPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, XCircle, Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/Datatable'
import { PageHeader } from '@/components/shared/PageHeader'
import { Can } from '@/components/layout/Guards'
import { salesApi } from '@/api'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'
import type { Sale, SaleStatus } from '@/types'

const STATUS_LABELS: Record<SaleStatus, string> = {
  completed: 'Completada',
  pending:   'Pendiente',
  canceled:  'Cancelada',
  returned:  'Devuelta',
}

const STATUS_COLORS: Record<SaleStatus, string> = {
  completed: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30',
  pending:   'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  canceled:  'bg-red-500/20 text-red-700 border-red-500/30',
  returned:  'bg-blue-500/20 text-blue-700 border-blue-500/30',
}

export default function SalesPage() {
  const qc = useQueryClient()
  const [page, setPage]           = useState(1)
  const [from, setFrom]           = useState('')
  const [to, setTo]               = useState('')
  const [selected, setSelected]   = useState<Sale | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [canceling, setCanceling] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['sales', { page, from, to }],
    queryFn: () => salesApi.list({
      page, limit: 20,
      from: from || undefined,
      to: to || undefined,
    }),
  })

  const { data: detail } = useQuery({
    queryKey: ['sale', selected?.id],
    queryFn: () => salesApi.getById(selected!.id),
    enabled: !!selected,
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      salesApi.cancel(id, reason),
    onSuccess: () => {
      toast.success('Venta cancelada')
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['sale', selected?.id] })
      setCanceling(false)
      setCancelReason('')
    },
    onError: () => toast.error('No se pudo cancelar la venta'),
  })

  const columns = [
    {
      key: 'folio', header: 'Folio',
      cell: (row: Sale) => <span className="font-mono text-sm font-bold text-indigo-600">{row.folio}</span>,
    },
    {
      key: 'date', header: 'Fecha',
      cell: (row: Sale) => <span className="text-sm text-slate-700">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'user', header: 'Cajero',
      cell: (row: Sale) => <span className="text-sm font-medium text-slate-900">{row.user?.full_name ?? '—'}</span>,
    },
    {
      key: 'customer', header: 'Cliente',
      cell: (row: Sale) => <span className="text-sm text-slate-600">{row.customer?.name ?? 'Público general'}</span>,
    },
    {
      key: 'items', header: 'Artículos',
      cell: (row: Sale) => <span className="text-sm font-medium text-slate-900">{row._count?.items ?? '—'}</span>,
      className: 'text-center',
    },
    {
      key: 'total', header: 'Total',
      cell: (row: Sale) => <span className="font-bold text-indigo-600">{formatCurrency(row.total)}</span>,
      className: 'text-right',
    },
    {
      key: 'status', header: 'Estado',
      cell: (row: Sale) => (
        <Badge className={cn('text-xs px-2.5 py-1', STATUS_COLORS[row.status])}>
          {STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      key: 'actions', header: '',
      cell: (row: Sale) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); setSelected(row) }}
          className="hover:bg-indigo-100 hover:text-indigo-600"
        >
          <Eye className="size-4" />
        </Button>
      ),
      className: 'w-12',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Ventas" description="Historial de todas las transacciones" />

      {/* Filtros */}
      <div className="backdrop-blur-xl bg-white/80 border border-white/50 rounded-xl p-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-slate-500" />
            <span className="text-sm text-slate-600 font-medium">Desde</span>
            <Input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1) }}
              className="w-40 border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-slate-500" />
            <span className="text-sm text-slate-600 font-medium">Hasta</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1) }}
              className="w-40 border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>
          {(from || to) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setFrom(''); setTo(''); setPage(1) }}
              className="border-slate-200 hover:bg-slate-100"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <DataTable
        columns={columns}
        data={data?.data}
        meta={data?.meta}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
        emptyMessage="No hay ventas en el período seleccionado"
        onRowClick={setSelected}
      />

      {/* Modal detalle de venta */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setCanceling(false) } }}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Venta <span className="font-mono text-indigo-600">{selected?.folio}</span></DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="space-y-6">
              {/* Info general */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600 font-medium">Fecha</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{formatDateTime(detail.created_at)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600 font-medium">Estado</p>
                  <Badge className={cn('text-xs px-2.5 py-1 mt-1 w-fit', STATUS_COLORS[detail.status])}>
                    {STATUS_LABELS[detail.status]}
                  </Badge>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600 font-medium">Cajero</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{detail.user?.full_name ?? '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600 font-medium">Cliente</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{detail.customer?.name ?? 'Público general'}</p>
                </div>
              </div>

              {/* Items */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-700">Producto</th>
                      <th className="text-center p-3 font-semibold text-slate-700">Cant.</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Precio</th>
                      <th className="text-right p-3 font-semibold text-slate-700">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-slate-900">{item.product?.name}</td>
                        <td className="p-3 text-center text-slate-700">{item.quantity} {item.product?.unit}</td>
                        <td className="p-3 text-right text-slate-900">{formatCurrency(item.unit_price)}</td>
                        <td className="p-3 text-right font-bold text-indigo-600">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4 space-y-2 border border-slate-200">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="text-slate-900">{formatCurrency(detail.subtotal)}</span>
                </div>
                {detail.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600 font-medium">
                    <span>Descuento</span>
                    <span>-{formatCurrency(detail.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-indigo-600 border-t border-slate-200 pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(detail.total)}</span>
                </div>
              </div>

              {/* Pagos */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">MÉTODOS DE PAGO</p>
                <div className="flex flex-wrap gap-2">
                  {detail.payments?.map((p) => (
                    <Badge
                      key={p.id}
                      className={cn(
                        'text-xs px-3 py-1.5',
                        p.method === 'cash'
                          ? 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-700 border-blue-500/30'
                      )}
                    >
                      <span className="font-semibold">
                        {p.method === 'cash' ? '💵 Efectivo' : p.method === 'card' ? `💳 Tarjeta ${p.card_brand ?? ''} ****${p.card_last4 ?? ''}` : p.method}
                      </span>
                      <span className="ml-2 font-bold">{formatCurrency(p.amount)}</span>
                      {p.change_given > 0 && (
                        <span className="ml-2 text-xs opacity-75">(cambio: {formatCurrency(p.change_given)})</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Cancelar venta */}
              {detail.status === 'completed' && (
                <Can resource="sales" action="cancel">
                  {!canceling ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCanceling(true)}
                      className="w-full border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 gap-2"
                    >
                      <XCircle className="size-4" />
                      Cancelar venta
                    </Button>
                  ) : (
                    <div className="space-y-3 border border-red-200 rounded-lg p-4 bg-red-50/50">
                      <p className="text-sm font-semibold text-red-700">¿Confirmar cancelación?</p>
                      <Input
                        placeholder="Motivo de cancelación"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="border-red-200 focus:border-red-400 focus:ring-red-400/20"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!cancelReason.trim() || cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate({ id: detail.id, reason: cancelReason })}
                          className="bg-red-600 hover:bg-red-500 text-white gap-2"
                        >
                          {cancelMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                          Confirmar cancelación
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCanceling(false)}
                          className="border-slate-200 hover:bg-slate-100"
                        >
                          Descartar
                        </Button>
                      </div>
                    </div>
                  )}
                </Can>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
