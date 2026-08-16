// src/pages/admin/tenants/TenantsPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Mail, Users, Building2, Pencil, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/Datatable'
import { adminTenantsApi } from '@/api/admin'
import { formatDate } from '@/lib/utils'
import type { TenantStatus } from '@/types'
import type { Tenant, TenantInput } from '@/types/admin'
import TenantForm from '@/components/forms/TenantForm'

const STATUS_LABELS: Record<TenantStatus, string> = {
  active:    'Activo',
  trial:     'Prueba',
  suspended: 'Suspendido',
  canceled:  'Cancelado',
}
const STATUS_VARIANT: Record<TenantStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active:    'success',
  trial:     'secondary',
  suspended: 'warning',
  canceled:  'destructive',
}

export default function TenantsPage() {
  const qc = useQueryClient()
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [open, setOpen]         = useState(false)
  const [editing, setEditing]   = useState<Tenant | null>(null)
  const [isDelete, setIsDelete] = useState<Tenant | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants', { page, search }],
    queryFn:  () => adminTenantsApi.list({ page, limit: 20, search: search || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: (data: TenantInput) => adminTenantsApi.create(data),
    onSuccess: () => { toast.success('Tenant creado'); qc.invalidateQueries({ queryKey: ['admin-tenants'] }); setOpen(false) },
    onError: () => toast.error('Error al crear el tenant'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TenantInput> }) => adminTenantsApi.update(id, data),
    onSuccess: () => { toast.success('Tenant actualizado'); qc.invalidateQueries({ queryKey: ['admin-tenants'] }); setEditing(null) },
    onError: () => toast.error('Error al actualizar el tenant'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => adminTenantsApi.delete(id),
    onSuccess: () => { toast.success('Tenant eliminado'); qc.invalidateQueries({ queryKey: ['admin-tenants'] }) },
    onError: () => toast.error('Error al eliminar el tenant'),
  })

  const columns = [
    {
      key: 'name', header: 'Tenant',
      cell: (row: Tenant) => (
        <div>
          <p className="font-medium text-sm text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500 font-mono">{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'owner', header: 'Propietario',
      cell: (row: Tenant) => (
        row.owner_email ? (
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Mail className="size-3" />{row.owner_email}
          </div>
        ) : <span className="text-xs text-slate-400">—</span>
      ),
    },
    {
      key: 'plan', header: 'Plan',
      cell: (row: Tenant) => (
        row.plan ? (
          <span className="text-sm font-medium text-slate-900">{row.plan.name}</span>
        ) : <span className="text-slate-400 text-sm">—</span>
      ),
    },
    {
      key: 'status', header: 'Estatus',
      cell: (row: Tenant) => (
        <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABELS[row.status]}</Badge>
      ),
    },
    {
      key: 'usage', header: 'Uso',
      cell: (row: Tenant) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Users className="size-3" /> {row._count?.users ?? 0} usuarios
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Building2 className="size-3" /> {row._count?.branches ?? 0} sucursales
          </div>
        </div>
      ),
    },
    {
      key: 'created_at', header: 'Alta',
      cell: (row: Tenant) => <span className="text-xs text-slate-500">{formatDate(row.created_at)}</span>,
    },
    {
      key: 'actions', header: 'Acciones',
      cell: (row: Tenant) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className='text-blue-600 hover:text-blue-900 hover:bg-blue-100' onClick={() => setEditing(row)}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="sm" className='text-red-600 hover:text-red-900 hover:bg-red-100' onClick={() => setIsDelete(row)}>
            <Trash />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tenants</h1>
          <p className="text-sm text-slate-600 mt-1">
            {data?.meta.total ?? 0} negocios registrados
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            onClick={() => setOpen(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            <Plus className="size-4" /> Nuevo tenant
          </Button>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/80 border border-white/50 rounded-xl p-4 shadow-lg">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"/>
            <Input
              placeholder="Buscar por nombre o identificador..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        meta={data?.meta}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
        emptyMessage="No hay tenants registrados"
      />

      {/* Dialog Create Tenant */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-xl font-bold text-gray-900 tracking-tight'>Nuevo tenant</DialogTitle>
          </DialogHeader>
          <TenantForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Update Tenant */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-xl font-bold text-gray-900 tracking-tight'>Editar tenant</DialogTitle>
          </DialogHeader>
          {editing && (
            <TenantForm
              defaultValues={{
                name:    editing.name,
                slug:    editing.slug,
                plan_id: editing.plan?.id ?? '',
                status:  editing.status,
              }}
              onSubmit={(data) => updateMutation.mutate({ id: editing.id, data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Delete Tenant */}
      <Dialog open={!!isDelete} onOpenChange={(o) => { if (!o) setIsDelete(null) }}>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-md w-full space-y-6">
          <DialogHeader>
            <DialogTitle>
              ¿Eliminar este tenant?
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-gray-500 leading-relaxed">
              Esta acción no se puede deshacer. Se perderá el acceso de este negocio y todos sus datos asociados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 w-full">
            <button
              type="button"
              className="flex-1 py-3 px-4 bg-white border border-gray-200 text-sm font-bold text-gray-700 rounded-xl transition-all hover:bg-gray-50 active:bg-gray-100 outline-none"
              onClick={() => setIsDelete(null)}
            >
              No, cancelar
            </button>

            <button
              type="button"
              className="flex-1 py-3 px-4 bg-blue-600 text-sm font-bold text-white rounded-xl transition-all shadow-md shadow-blue-600/10 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98] outline-none"
              onClick={() => { if (isDelete) deleteMutation.mutate({ id: isDelete.id }) }}
            >
              Sí, eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
