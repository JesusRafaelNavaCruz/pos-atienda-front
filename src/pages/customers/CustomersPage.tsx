// src/pages/customers/CustomersPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Star, Phone, Mail, Pencil, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/Datatable'
import { Can } from '@/components/layout/Guards'
import { customersApi } from '@/api'
import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/types'
import CustomerForm from '@/components/forms/CustomerForm'


export default function CustomersPage() {
  const qc = useQueryClient()
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [isDelete, setIsDelete] = useState<Customer | null>(null);

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
    mutationFn: ({id}: {id: string}) => customersApi.delete(id),
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
      key: 'actions', header: 'Acciones',
      cell: (row: Customer) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Can resource="customers" action="update">
            <Button variant="ghost" size="sm" className='text-blue-600 hover:text-blue-900 hover:bg-blue-100' onClick={() => setEditing(row)}>
              <Pencil />
            </Button>
          </Can>
          <Can resource="customers" action="delete">
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-600 mt-1">
            {data?.meta.total ?? 0} clientes registrados
          </p>
        </div>
        <div className='flex gap-2'>
          <Can resource="customers" action="create">
            <Button
              onClick={() => setOpen(true)}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            >
              <Plus className="size-4" /> Nuevo cliente
            </Button>
          </Can>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/80 border border-white/50 rounded-xl p-4 shadow-lg">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"/>
            <Input
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => {setSearch(e.target.value); setPage(1)} }
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
        emptyMessage="No hay clientes registrados"
      />

      {/* Dialog Create Customer */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-xl w-full space-y-4">
          <DialogHeader>
            <DialogTitle className='text-xl font-bold text-gray-900 tracking-tight'>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Update Customer */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-xl w-full space-y-4">
          <DialogHeader>
            <DialogTitle className='text-xl font-bold text-gray-900 tracking-tight'>Editar cliente</DialogTitle>
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

      {/* Dialog Delete Customer */}
      <Dialog open={!!isDelete} onOpenChange={(o) => { if (!o) setIsDelete(null) } }>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-md w-full space-y-6">
          <DialogHeader>
            <DialogTitle>
              ¿Eliminar este producto?
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-gray-500 leading-relaxed">
              Esta acción no se puede deshacer. El producto se borrará permanentemente del inventario.
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
