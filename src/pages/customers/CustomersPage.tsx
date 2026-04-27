// src/pages/customers/CustomersPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Star, Phone, Mail, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/Datatable'
import { PageHeader } from '@/components/shared/PageHeader'
import { Can } from '@/components/layout/Guards'
import { customersApi } from '@/api'
import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/types'

const glassCard  = 'backdrop-blur-xl bg-white/80 border border-slate-200/60 shadow-lg'
const inputClass = 'bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-indigo-500'

const customerSchema = z.object({
  name:         z.string().min(1, 'Nombre requerido'),
  phone:        z.string().optional(),
  email:        z.string().email('Email inválido').optional().or(z.literal('')),
  rfc:          z.string().max(13).optional(),
  address:      z.string().optional(),
  credit_limit: z.number().min(0),
  notes:        z.string().optional(),
})
type FormData = z.infer<typeof customerSchema>

function CustomerForm({
  defaultValues, onSubmit, isLoading,
}: {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => void
  isLoading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: { credit_limit: 0, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label className="text-white/80">Nombre *</Label>
          <Input className={inputClass} {...register('name')} placeholder="Nombre completo" />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Teléfono</Label>
          <Input className={inputClass} {...register('phone')} placeholder="55 1234 5678" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Correo</Label>
          <Input className={inputClass} {...register('email')} type="email" placeholder="cliente@email.com" />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">RFC</Label>
          <Input className={inputClass} {...register('rfc')} placeholder="XAXX010101000" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Límite de crédito</Label>
          <Input className={inputClass} {...register('credit_limit', { valueAsNumber: true })} type="number" min={0} step={0.01} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label className="text-white/80">Dirección</Label>
          <Input className={inputClass} {...register('address')} placeholder="Calle, colonia, ciudad" />
        </div>
      </div>
      <DialogFooter>
        <Button
          type="submit" disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function CustomersPage() {
  const qc = useQueryClient()
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { page, search }],
    queryFn:  () => customersApi.list({ page, limit: 20, search: search || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => { toast.success('Cliente creado'); qc.invalidateQueries({ queryKey: ['customers'] }); setOpen(false) },
    onError: () => toast.error('Error al crear cliente'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) => customersApi.update(id, data),
    onSuccess: () => { toast.success('Cliente actualizado'); qc.invalidateQueries({ queryKey: ['customers'] }); setEditing(null) },
    onError: () => toast.error('Error al actualizar cliente'),
  })

  const deleteMutation = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => { toast.success('Cliente desactivado'); qc.invalidateQueries({ queryKey: ['customers'] }) },
    onError: () => toast.error('Error al desactivar cliente'),
  })

  const columns = [
    {
      key: 'name', header: 'Cliente',
      cell: (row: Customer) => (
        <div>
          <p className="font-medium text-sm text-slate-900">{row.name}</p>
          {row.rfc && <p className="text-xs text-slate-500 font-mono">{row.rfc}</p>}
        </div>
      ),
    },
    {
      key: 'contact', header: 'Contacto',
      cell: (row: Customer) => (
        <div className="space-y-0.5">
          {row.phone && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Phone className="size-3" />{row.phone}
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Mail className="size-3" />{row.email}
            </div>
          )}
          {!row.phone && !row.email && <span className="text-xs text-slate-400">—</span>}
        </div>
      ),
    },
    {
      key: 'loyalty', header: 'Puntos',
      cell: (row: Customer) => (
        <div className="flex items-center gap-1">
          <Star className="size-3.5 text-yellow-500 fill-yellow-500" />
          <span className="font-medium text-slate-900">{row.loyalty_points}</span>
        </div>
      ),
      className: 'text-center',
    },
    {
      key: 'credit', header: 'Crédito',
      cell: (row: Customer) => (
        row.credit_limit > 0 ? (
          <div className="text-sm">
            <p className="font-medium text-slate-900">{formatCurrency(row.credit_limit)}</p>
            {row.credit_balance > 0 && (
              <p className="text-xs text-red-600">Debe: {formatCurrency(row.credit_balance)}</p>
            )}
          </div>
        ) : <span className="text-slate-400 text-sm">—</span>
      ),
    },
    {
      key: 'sales', header: 'Compras',
      cell: (row: Customer) => (
        <span className="text-sm text-slate-700">{row._count?.sales ?? 0}</span>
      ),
      className: 'text-center',
    },
    {
      key: 'actions', header: '',
      cell: (row: Customer) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Can resource="customers" action="update">
            <Button
              variant="ghost" size="sm"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              onClick={() => setEditing(row)}
            >
              Editar
            </Button>
          </Can>
          <Can resource="customers" action="delete">
            <Button
              variant="ghost" size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => { if (confirm('¿Desactivar este cliente?')) deleteMutation.mutate(row.id) }}
            >
              Desactivar
            </Button>
          </Can>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Clientes" description={`${data?.meta.total ?? 0} clientes registrados`}>
        <Can resource="customers" action="create">
          <Button
            onClick={() => setOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
          >
            <Plus className="size-4" /> Nuevo cliente
          </Button>
        </Can>
      </PageHeader>

      <Card className={glassCard}>
        <CardContent className="p-4 space-y-4">
          {/* Buscador */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
            <Input
              placeholder="Buscar por nombre, teléfono o RFC..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className={`pl-9 ${inputClass}`}
            />
          </div>

          <DataTable
            columns={columns}
            data={data?.data}
            meta={data?.meta}
            isLoading={isLoading}
            page={page}
            onPageChange={setPage}
            emptyMessage="No hay clientes registrados"
          />
        </CardContent>
      </Card>

      {/* Modal crear */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="backdrop-blur-xl bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Nuevo cliente</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="backdrop-blur-xl bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Editar cliente</DialogTitle>
          </DialogHeader>
          {editing && (
            <CustomerForm
              defaultValues={{
                name:         editing.name,
                phone:        editing.phone ?? undefined,
                email:        editing.email ?? undefined,
                rfc:          editing.rfc ?? undefined,
                address:      editing.address ?? undefined,
                credit_limit: editing.credit_limit ?? 0,
                notes:        editing.notes ?? undefined,
              }}
              onSubmit={(data) => updateMutation.mutate({ id: editing.id, data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
