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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/Datatable'
import { PageHeader } from '@/components/shared/PageHeader'
import { Can } from '@/components/layout/Guards'
import { suppliersApi } from '@/api'
import type { Supplier } from '@/types'

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
  defaultValues,
  onSubmit,
  isLoading,
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
          <Label>Nombre del proveedor *</Label>
          <Input {...register('name')} placeholder="Distribuidora XYZ" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Contacto</Label>
          <Input {...register('contact_name')} placeholder="Juan Pérez" />
        </div>
        <div className="space-y-2">
          <Label>RFC</Label>
          <Input {...register('rfc')} placeholder="XAXX010101000" />
        </div>
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <Input {...register('phone')} placeholder="55 1234 5678" />
        </div>
        <div className="space-y-2">
          <Label>Correo</Label>
          <Input {...register('email')} type="email" placeholder="ventas@proveedor.com" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Dirección</Label>
          <Input {...register('address')} placeholder="Calle, colonia, ciudad" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Notas</Label>
          <Textarea {...register('notes')} placeholder="Días de entrega, condiciones de pago..." rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading}>
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
    onSuccess: () => {
      toast.success('Proveedor creado')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setOpen(false)
    },
    onError: () => toast.error('Error al crear proveedor'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) =>
      suppliersApi.update(id, data),
    onSuccess: () => {
      toast.success('Proveedor actualizado')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      setEditing(null)
    },
    onError: () => toast.error('Error al actualizar proveedor'),
  })

  const deleteMutation = useMutation({
    mutationFn: suppliersApi.delete,
    onSuccess: () => {
      toast.success('Proveedor desactivado')
      qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    onError: () => toast.error('Error al desactivar proveedor'),
  })

  const columns = [
    {
      key: 'name',
      header: 'Proveedor',
      cell: (row: Supplier) => (
        <div>
          <p className="font-medium text-sm">{row.name}</p>
          {row.contact_name && (
            <p className="text-xs text-muted-foreground">{row.contact_name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contacto',
      cell: (row: Supplier) => (
        <div className="space-y-0.5">
          {row.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="size-3" /> {row.phone}
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="size-3" /> {row.email}
            </div>
          )}
          {!row.phone && !row.email && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'rfc',
      header: 'RFC',
      cell: (row: Supplier) => (
        <span className="font-mono text-xs">{row.rfc ?? '—'}</span>
      ),
    },
    {
      key: 'products',
      header: 'Productos',
      cell: (row: Supplier) => (
        <div className="flex items-center gap-1.5">
          <Package className="size-3.5 text-muted-foreground" />
          <span className="text-sm">{row._count?.products ?? 0}</span>
        </div>
      ),
      className: 'text-center',
    },
    {
      key: 'actions',
      header: '',
      cell: (row: Supplier) => (
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Can resource="suppliers" action="update">
            <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
              Editar
            </Button>
          </Can>
          <Can resource="suppliers" action="delete">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm('¿Desactivar este proveedor?')) {
                  deleteMutation.mutate(row.id)
                }
              }}
            >
              Desactivar
            </Button>
          </Can>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Proveedores"
        description={`${data?.meta.total ?? 0} proveedores registrados`}
      >
        <Can resource="suppliers" action="create">
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Nuevo proveedor
          </Button>
        </Can>
      </PageHeader>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, contacto o RFC..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
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

      {/* Modal crear */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo proveedor</DialogTitle>
          </DialogHeader>
          <SupplierForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar proveedor</DialogTitle>
          </DialogHeader>
          {editing && (
            <SupplierForm
              defaultValues={editing}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editing.id, data })
              }
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
