// src/pages/admin/suscriptions/SuscriptionsPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash, Users, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DataTable } from '@/components/shared/Datatable'
import { adminPlansApi } from '@/api/admin'
import { formatCurrency } from '@/lib/utils'
import type { Plan } from '@/types'
import PlanForm from '@/components/forms/PlanForm'

export default function SuscriptionsPage() {
  const qc = useQueryClient()
  const [open, setOpen]         = useState(false)
  const [editing, setEditing]   = useState<Plan | null>(null)
  const [isDelete, setIsDelete] = useState<Plan | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn:  () => adminPlansApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: adminPlansApi.create,
    onSuccess: () => { toast.success('Plan creado'); qc.invalidateQueries({ queryKey: ['admin-plans'] }); setOpen(false) },
    onError: () => toast.error('Error al crear el plan'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Plan> }) => adminPlansApi.update(id, data),
    onSuccess: () => { toast.success('Plan actualizado'); qc.invalidateQueries({ queryKey: ['admin-plans'] }); setEditing(null) },
    onError: () => toast.error('Error al actualizar el plan'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => adminPlansApi.delete(id),
    onSuccess: () => { toast.success('Plan eliminado'); qc.invalidateQueries({ queryKey: ['admin-plans'] }) },
    onError: () => toast.error('Error al eliminar el plan'),
  })

  const columns = [
    {
      key: 'name', header: 'Plan',
      cell: (row: Plan) => (
        <div>
          <p className="font-medium text-sm text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500 font-mono">{row.code}</p>
        </div>
      ),
    },
    {
      key: 'price', header: 'Precio',
      cell: (row: Plan) => (
        <div className="text-sm">
          <p className="font-medium text-slate-900">{formatCurrency(row.price_mxn)}</p>
          <p className="text-xs text-slate-500">{row.billing_interval === 'monthly' ? 'Mensual' : 'Anual'}</p>
        </div>
      ),
    },
    {
      key: 'limits', header: 'Límites',
      cell: (row: Plan) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Users className="size-3" /> {row.max_users} usuarios
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Building2 className="size-3" /> {row.max_branches} sucursales
          </div>
        </div>
      ),
    },
    {
      key: 'trial', header: 'Prueba',
      cell: (row: Plan) => <span className="text-sm text-slate-700">{row.trial_days} días</span>,
      className: 'text-center',
    },
    {
      key: 'features', header: 'Features',
      cell: (row: Plan) => {
        const count = Object.values(row.features ?? {}).filter((v) => v !== 'false' && v !== '0').length
        return <span className="text-sm text-slate-700">{count} activas</span>
      },
      className: 'text-center',
    },
    {
      key: 'actions', header: 'Acciones',
      cell: (row: Plan) => (
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
          <h1 className="text-3xl font-bold text-slate-900">Suscripciones</h1>
          <p className="text-sm text-slate-600 mt-1">
            {data?.length ?? 0} planes configurados
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            onClick={() => setOpen(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            <Plus className="size-4" /> Nuevo Plan
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        meta={undefined}
        isLoading={isLoading}
        page={1}
        onPageChange={() => {}}
        emptyMessage="No hay planes configurados"
      />

      {/* Dialog Create Plan */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-xl font-bold text-gray-900 tracking-tight'>Nuevo plan</DialogTitle>
          </DialogHeader>
          <PlanForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Update Plan */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-xl font-bold text-gray-900 tracking-tight'>Editar plan</DialogTitle>
          </DialogHeader>
          {editing && (
            <PlanForm
              defaultValues={{
                name:             editing.name,
                code:             editing.code,
                price_mxn:        editing.price_mxn,
                billing_interval: editing.billing_interval,
                max_users:        editing.max_users,
                max_branches:     editing.max_branches,
                trial_days:       editing.trial_days,
                features:         editing.features,
              }}
              onSubmit={(data) => updateMutation.mutate({ id: editing.id, data })}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Delete Plan */}
      <Dialog open={!!isDelete} onOpenChange={(o) => { if (!o) setIsDelete(null) }}>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-md w-full space-y-6">
          <DialogHeader>
            <DialogTitle>
              ¿Eliminar este plan?
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-gray-500 leading-relaxed">
              Esta acción no se puede deshacer. Los tenants suscritos a este plan podrían verse afectados.
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
