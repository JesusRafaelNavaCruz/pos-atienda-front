// src/pages/sales/SalesPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/Datatable'
import { PageHeader } from '@/components/shared/PageHeader'
import { Can } from '@/components/layout/Guards'
import { salesApi } from '@/api'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Sale, SaleStatus } from '@/types'

const STATUS_LABELS: Record<SaleStatus, string> = {
  completed: 'Completada',
  pending:   'Pendiente',
  canceled:  'Cancelada',
  returned:  'Devuelta',
}
const STATUS_VARIANT: Record<SaleStatus, 'success' | 'secondary' | 'destructive' | 'warning'> = {
  completed: 'success',
  pending:   'warning',
  canceled:  'destructive',
  returned:  'secondary',
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
      cell: (row: Sale) => <span className="font-mono text-sm font-medium">{row.folio}</span>,
    },
    {
      key: 'date', header: 'Fecha',
      cell: (row: Sale) => <span className="text-sm">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'user', header: 'Cajero',
      cell: (row: Sale) => <span className="text-sm">{row.user?.full_name ?? '—'}</span>,
    },
    {
      key: 'customer', header: 'Cliente',
      cell: (row: Sale) => <span className="text-sm text-muted-foreground">{row.customer?.name ?? 'Público general'}</span>,
    },
    {
      key: 'items', header: 'Artículos',
      cell: (row: Sale) => <span className="text-sm">{row._count?.items ?? '—'}</span>,
      className: 'text-center',
    },
    {
      key: 'total', header: 'Total',
      cell: (row: Sale) => <span className="font-semibold">{formatCurrency(row.total)}</span>,
      className: 'text-right',
    },
    {
      key: 'status', header: 'Estado',
      cell: (row: Sale) => (
        <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABELS[row.status]}</Badge>
      ),
    },
    {
      key: 'actions', header: '',
      cell: (row: Sale) => (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelected(row) }}>
          <Eye className="size-4" />
        </Button>
      ),
      className: 'w-12',
    },
  ]

  return (
    <div className="p-6">
      <PageHeader title="Ventas" description="Historial de todas las transacciones" />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Desde</span>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} className="w-40" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Hasta</span>
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} className="w-40" />
        </div>
        {(from || to) && (
          <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); setPage(1) }}>
            Limpiar filtros
          </Button>
        )}
      </div>

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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Venta {selected?.folio}</DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              {/* Info general */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDateTime(detail.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <Badge variant={STATUS_VARIANT[detail.status]}>{STATUS_LABELS[detail.status]}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Cajero</p>
                  <p className="font-medium">{detail.user?.full_name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{detail.customer?.name ?? 'Público general'}</p>
                </div>
              </div>

              {/* Items */}
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Producto</th>
                      <th className="text-center p-3 font-medium">Cant.</th>
                      <th className="text-right p-3 font-medium">Precio</th>
                      <th className="text-right p-3 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items?.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">{item.product?.name}</td>
                        <td className="p-3 text-center">{item.quantity} {item.product?.unit}</td>
                        <td className="p-3 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(detail.subtotal)}</span>
                </div>
                {detail.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento</span>
                    <span>-{formatCurrency(detail.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(detail.total)}</span>
                </div>
              </div>

              {/* Pagos */}
              <div className="flex flex-wrap gap-2">
                {detail.payments?.map((p) => (
                  <Badge key={p.id} variant="secondary">
                    {p.method === 'cash' ? 'Efectivo' : p.method === 'card' ? `Tarjeta ${p.card_brand ?? ''} ****${p.card_last4 ?? ''}` : p.method}
                    {' '}· {formatCurrency(p.amount)}
                    {p.change_given > 0 && ` (cambio: ${formatCurrency(p.change_given)})`}
                  </Badge>
                ))}
              </div>

              {/* Cancelar */}
              {detail.status === 'completed' && (
                <Can resource="sales" action="cancel">
                  {!canceling ? (
                    <Button variant="destructive" size="sm" onClick={() => setCanceling(true)}>
                      <XCircle className="size-4" /> Cancelar venta
                    </Button>
                  ) : (
                    <div className="space-y-2 border border-destructive/40 rounded-md p-3 bg-destructive/5">
                      <p className="text-sm font-medium text-destructive">¿Confirmar cancelación?</p>
                      <Input
                        placeholder="Motivo de cancelación"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="destructive" size="sm"
                          disabled={!cancelReason.trim() || cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate({ id: detail.id, reason: cancelReason })}
                        >
                          Confirmar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCanceling(false)}>
                          Cancelar
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
