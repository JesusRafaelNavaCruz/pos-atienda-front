// src/pages/suppliers/SuppliersPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Phone, Mail, Package, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/Datatable'
import { PageHeader } from '@/components/shared/PageHeader'
import { Can } from '@/components/layout/Guards'
import { suppliersApi } from '@/api'
import type { Supplier } from '@/types'

const glassCard  = 'backdrop-blur-xl bg-white/80 border border-slate-200/60 shadow-lg'
const inputClass = 'bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-indigo-500'

const supplierSchema = z.object({
  name:         z.string().min(1, 'Nombre requerido'),
  contact_name: z.string().optional(),
  phone:        z.string().optional(),
  email:        z.string().email('Email inválido').optional().or(z.literal('')),
  rfc:          z.string().max(13).optional(),
  address:      z.string().optional(),
  notes:        z.string().optional(),
})
type FormData = z.infer<typeof supplierSchema>

function SupplierForm({
  defaultValues, onSubmit, isLoading,
}: {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => void
  isLoading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label className="text-white/80">Nombre del proveedor *</Label>
          <Input className={inputClass} {...register('name')} placeholder="Distribuidora XYZ" />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Contacto</Label>
          <Input className={inputClass} {...register('contact_name')} placeholder="Juan Pérez" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">RFC</Label>
          <Input className={inputClass} {...register('rfc')} placeholder="XAXX010101000" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Teléfono</Label>
          <Input className={inputClass} {...register('phone')} placeholder="55 1234 5678" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Correo</Label>
          <Input className={inputClass} {...register('email')} type="email" placeholder="ventas@proveedor.com" />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>
        <div className="col-span-2 space-y-2">
          <Label className="text-white/80">Dirección</Label>
          <Input className={inputClass} {...register('address')} placeholder="Calle, colonia, ciudad" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label className="text-white/80">Notas</Label>
          <Textarea
            className={`${inputClass} resize-none`}
            {...register('notes')}
            placeholder="Días de entrega, condiciones de pago..."
            rows={3}
          />
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

export default function SuppliersPage() {
  const qc = useQueryClient()
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { page, search }],
    queryFn: () => suppliersApi.list({ page, limit: 20, search: search || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => { toast.success('Proveedor creado'); qc.invalidateQueries({ queryKey: ['suppliers'] }); setOpen(false) },
    onError: () => toast.error('Error al crear proveedor'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) => suppliersApi.update(id, data),
    onSuccess: () => { toast.success('Proveedor actualizado'); qc.invalidateQueries({ queryKey: ['suppliers'] }); setEditing(null) },
    onError: () => toast.error('Error al actualizar proveedor'),
  })

  const deleteMutation = useMutation({
    mutationFn: suppliersApi.delete,
    onSuccess: () => { toast.success('Proveedor desactivado'); qc.invalidateQueries({ queryKey: ['suppliers'] }) },
    onError: () => toast.error('Error al desactivar proveedor'),
  })

  const columns = [
    {
      key: 'name', header: 'Proveedor',
      cell: (row: Supplier) => (
        <div>
          <p className="font-medium text-sm text-slate-900">{row.name}</p>
          {row.contact_name && <p className="text-xs text-slate-500">{row.contact_name}</p>}
        </div>
      ),
    },
    {
      key: 'contact', header: 'Contacto',
      cell: (row: Supplier) => (
        <div className="space-y-0.5">
          {row.phone && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Phone className="size-3" /> {row.phone}
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Mail className="size-3" /> {row.email}
            </div>
          )}
          {!row.phone && !row.email && <span className="text-xs text-slate-400">—</span>}
        </div>
      ),
    },
    {
      key: 'rfc', header: 'RFC',
      cell: (row: Supplier) => (
        <span className="font-mono text-xs text-slate-600">{row.rfc ?? '—'}</span>
      ),
    },
    {
      key: 'products', header: 'Productos',
      cell: (row: Supplier) => (
        <div className="flex items-center gap-1.5">
          <Package className="size-3.5 text-slate-400" />
          <span className="text-sm text-slate-700">{row._count?.products ?? 0}</span>
        </div>
      ),
      className: 'text-center',
    },
    {
      key: 'actions', header: '',
      cell: (row: Supplier) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Can resource="suppliers" action="update">
            <Button
              variant="ghost" size="sm"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              onClick={() => setEditing(row)}
            >
              Editar
            </Button>
          </Can>
          <Can resource="suppliers" action="delete">
            <Button
              variant="ghost" size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => { if (confirm('¿Desactivar este proveedor?')) deleteMutation.mutate(row.id) }}
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
      <PageHeader title="Proveedores" description={`${data?.meta.total ?? 0} proveedores registrados`}>
        <Can resource="suppliers" action="create">
          <Button
            onClick={() => setOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
          >
            <Plus className="size-4" /> Nuevo proveedor
          </Button>
        </Can>
      </PageHeader>

      <Card className={glassCard}>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
            <Input
              placeholder="Buscar por nombre, contacto o RFC..."
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
            emptyMessage="No hay proveedores registrados"
          />
        </CardContent>
      </Card>

      {/* Modal crear */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="backdrop-blur-xl bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Nuevo proveedor</DialogTitle>
          </DialogHeader>
          <SupplierForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="backdrop-blur-xl bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Editar proveedor</DialogTitle>
          </DialogHeader>
          {editing && (
            <SupplierForm
              defaultValues={editing}
              onSubmit={(data) => updateMutation.mutate({ id: editing.id, data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
