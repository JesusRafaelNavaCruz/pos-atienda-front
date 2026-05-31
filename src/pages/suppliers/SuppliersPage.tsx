// src/pages/suppliers/SuppliersPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Phone, Mail, Package, Trash, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/Datatable'
import { Can } from '@/components/layout/Guards'
import { suppliersApi } from '@/api'
import type { Supplier } from '@/types'
import SupplierForm from '@/components/forms/SupplierForm'


export default function SuppliersPage() {
  const qc = useQueryClient()
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [isDelete, setIsDelete] = useState<Supplier | null>(null);

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
    mutationFn: ({id}: {id: string}) => suppliersApi.delete(id),
    onSuccess: () => { toast.success('Proveedor desactivado'); qc.invalidateQueries({ queryKey: ['suppliers'] }); setIsDelete(null) },
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
      key: 'actions', header: 'Acciones',
      cell: (row: Supplier) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Can resource="suppliers" action="update">
            <Button variant="ghost" size="sm" className='text-blue-600 hover:text-blue-900 hover:bg-blue-100' onClick={() => setEditing(row)}>
              <Pencil />
            </Button>
          </Can>
          <Can resource='supplier' action='delete'>
            <Button variant="ghost" size="sm" className='text-red-600 hover:text-red-900 hover:bg-red-100' onClick={() => setIsDelete(row)}>
              <Trash />
            </Button>
          </Can>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className='text-3xl font-bold text-slate-900'>Proveedores</h1>
          <p>{data?.meta.total ?? 0} proveedores registrados</p>
        </div>
        <div className="flex gap-2">
          <Can resource='suppliers' action='create'>
            <Button onClick={() => setOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
              <Plus className="size-4" />
              Nuevo proveedor
            </Button>
          </Can>
        </div>
      </div>

      {/* Filtros */}
      <div className="backdrop-blur-xl bg-white/80 border border-white/50 rounded-xl p-4 shadow-lg">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre..."
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
        emptyMessage="No hay proveedores registrados"
      />

      {/* Dialog Create Supplier */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-xl w-full space-y-4">
          <DialogHeader>
            <DialogTitle className='text-xl font-bold text-gray-900 tracking-tight'>Nuevo producto</DialogTitle>
          </DialogHeader>
          <SupplierForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Update Supplier */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-xl w-full space-y-4">
          <DialogHeader>
            <DialogTitle className='text-xl font-bold text-gray-900 tracking-tight'>Editar proveedor</DialogTitle>
          </DialogHeader>
          {editing && (
            <SupplierForm
              defaultValues={{
                name:         editing.name,
                contact_name: editing.contact_name ?? undefined,
                phone:        editing.phone        ?? undefined,
                email:        editing.email        ?? undefined,
                rfc:          editing.rfc          ?? undefined,
                address:      editing.address      ?? undefined,
                notes:        editing.notes        ?? undefined,
              }}
              onSubmit={(data) => updateMutation.mutate({ id: editing.id, data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!isDelete} onOpenChange={(o) => { if (!o) setIsDelete(null) } }>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-md w-full space-y-6">
          <DialogHeader>
            <DialogTitle>
              ¿Eliminar este proveedor?
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-gray-500 leading-relaxed">
              Esta acción no se puede deshacer. El proveedor se borrará permanentemente.
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
              onClick={() => {if (isDelete) deleteMutation.mutate({id: isDelete.id })}}
            >
              Sí, eliminar
            </button>
          </div>    
        </DialogContent>
      </Dialog>

    </div>
  )
}
