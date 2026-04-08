// src/pages/inventory/InventoryMovementsPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/badge'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/Datatable'
import { PageHeader } from '@/components/shared/PageHeader'
import { Can } from '@/components/layout/Guards'
import { inventoryApi, productsApi } from '@/api'
import { formatDateTime, cn } from '@/lib/utils'
import type { InventoryMovement, InventoryMovementType } from '@/types'

const TYPE_LABELS: Record<InventoryMovementType, string> = {
  sale:       'Venta',
  purchase:   'Compra',
  adjustment: 'Ajuste',
  return:     'Devolución',
  loss:       'Merma',
  initial:    'Stock inicial',
}

const adjustSchema = z.object({
  product_id: z.string().uuid('Selecciona un producto'),
  type:       z.enum(['purchase', 'adjustment', 'loss']),
  delta:      z.coerce.number().refine((n) => n !== 0, 'La cantidad no puede ser cero'),
  reason:     z.string().min(3, 'Describe el motivo (mínimo 3 caracteres)'),
})
type AdjustData = z.infer<typeof adjustSchema>

function AdjustmentForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: AdjustData) => void
  isLoading: boolean
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AdjustData>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { type: 'adjustment' },
  })

  const { data: products } = useQuery({
    queryKey: ['products-for-adjust'],
    queryFn: () => productsApi.list({ limit: 200, is_active: true }),
  })

  const movType = watch('type')
  const isEntry = movType === 'purchase'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Producto *</Label>
        <select
          {...register('product_id')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">Seleccionar producto</option>
          {products?.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — Stock: {p.stock} {p.unit}
            </option>
          ))}
        </select>
        {errors.product_id && (
          <p className="text-xs text-destructive">{errors.product_id.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de movimiento *</Label>
          <Select
            defaultValue="adjustment"
            onValueChange={(v) => setValue('type', v as AdjustData['type'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="purchase">Compra / entrada</SelectItem>
              <SelectItem value="adjustment">Ajuste de conteo</SelectItem>
              <SelectItem value="loss">Merma / pérdida</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Cantidad *{' '}
            <span className="text-xs text-muted-foreground">
              ({isEntry ? 'positivo = entrada' : 'negativo = salida'})
            </span>
          </Label>
          <Input
            {...register('delta')}
            type="number"
            step="0.001"
            placeholder={isEntry ? '+10' : '-5'}
          />
          {errors.delta && (
            <p className="text-xs text-destructive">{errors.delta.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Motivo *</Label>
        <Textarea
          {...register('reason')}
          placeholder="Ej: Conteo físico, producto caducado, recepción de pedido..."
          rows={2}
        />
        {errors.reason && (
          <p className="text-xs text-destructive">{errors.reason.message}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Registrar movimiento
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function InventoryMovementsPage() {
  const qc = useQueryClient()
  const [page, setPage]       = useState(1)
  const [open, setOpen]       = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-movements', { page, typeFilter }],
    queryFn: () =>
      inventoryApi.movements({
        page,
        limit: 30,
        type: typeFilter || undefined,
      }),
  })

  const adjustMutation = useMutation({
    mutationFn: inventoryApi.adjust,
    onSuccess: () => {
      toast.success('Movimiento registrado')
      qc.invalidateQueries({ queryKey: ['inventory-movements'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setOpen(false)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Error al registrar movimiento'
      toast.error(msg)
    },
  })

  const columns = [
    {
      key: 'date',
      header: 'Fecha',
      cell: (row: InventoryMovement) => (
        <span className="text-sm whitespace-nowrap">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'product',
      header: 'Producto',
      cell: (row: InventoryMovement) => (
        <div>
          <p className="text-sm font-medium">{row.product?.name ?? '—'}</p>
          {row.product?.barcode && (
            <p className="text-xs font-mono text-muted-foreground">{row.product.barcode}</p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (row: InventoryMovement) => (
        <Badge variant="secondary">{TYPE_LABELS[row.type] ?? row.type}</Badge>
      ),
    },
    {
      key: 'delta',
      header: 'Cantidad',
      cell: (row: InventoryMovement) => (
        <div className={cn(
          'flex items-center gap-1.5 font-mono font-semibold text-sm',
          row.delta > 0 ? 'text-green-600' : 'text-red-600',
        )}>
          {row.delta > 0
            ? <ArrowUpCircle className="size-4" />
            : <ArrowDownCircle className="size-4" />
          }
          {row.delta > 0 ? '+' : ''}{row.delta} {row.product?.unit}
        </div>
      ),
      className: 'text-right',
    },
    {
      key: 'stock',
      header: 'Stock resultante',
      cell: (row: InventoryMovement) => (
        <span className="font-mono text-sm">{row.quantity_after} {row.product?.unit}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'user',
      header: 'Usuario',
      cell: (row: InventoryMovement) => (
        <span className="text-sm text-muted-foreground">{row.user?.full_name ?? '—'}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Motivo',
      cell: (row: InventoryMovement) => (
        <span className="text-xs text-muted-foreground line-clamp-1">{row.reason ?? '—'}</span>
      ),
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Movimientos de inventario"
        description="Historial de entradas, salidas y ajustes"
      >
        <Can resource="inventory" action="adjust">
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Ajuste manual
          </Button>
        </Can>
      </PageHeader>

      {/* Filtro por tipo */}
      <div className="flex items-center gap-3 mb-6">
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los tipos</SelectItem>
            <SelectItem value="sale">Venta</SelectItem>
            <SelectItem value="purchase">Compra</SelectItem>
            <SelectItem value="adjustment">Ajuste</SelectItem>
            <SelectItem value="loss">Merma</SelectItem>
            <SelectItem value="return">Devolución</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        meta={data?.meta}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
        emptyMessage="No hay movimientos registrados"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajuste manual de inventario</DialogTitle>
          </DialogHeader>
          <AdjustmentForm
            onSubmit={(data) => adjustMutation.mutate(data)}
            isLoading={adjustMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
