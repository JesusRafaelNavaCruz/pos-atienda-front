import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { Label } from "../ui/badge";
import { Input } from "../ui/input";
import { DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Loader2 } from "lucide-react";
import { adminPlansApi } from "@/api/admin";
import type { TenantStatus } from "@/types";

const STATUS_LABELS: Record<TenantStatus, string> = {
  active:    'Activo',
  trial:     'Prueba',
  suspended: 'Suspendido',
  canceled:  'Cancelado',
}

const tenantSchema = z.object({
  name:           z.string().min(2, 'Nombre requerido'),
  slug:           z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  plan_id:        z.string().min(1, 'Selecciona un plan'),
  status:         z.enum(['active', 'trial', 'suspended', 'canceled']),
  owner_name:     z.string().optional(),
  owner_email:    z.string().email('Email inválido').optional().or(z.literal('')),
  owner_password: z.string().optional(),
})
type FormData = z.infer<typeof tenantSchema>

const inputClass = 'w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 placeholder:font-normal hover:border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-50'
const selectTriggerClass = "flex w-full items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 hover:border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 text-left";
const selectItemClass = "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 px-3 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-50 focus:bg-gray-50 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-semibold";

export default function TenantForm({
  defaultValues,
  onSubmit,
  isLoading,
}: {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}) {
  const isEdit = !!defaultValues

  const { data: plans } = useQuery({ queryKey: ['admin-plans'], queryFn: () => adminPlansApi.list() })

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { status: 'trial', ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Nombre del negocio *</Label>
          <Input className={inputClass} {...register('name')} placeholder="Abarrotes Don José" />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Identificador (slug) *</Label>
          <Input className={inputClass} {...register('slug')} placeholder="don-jose" autoCapitalize="none" disabled={isEdit} />
          {errors.slug && <p className="text-xs text-red-400">{errors.slug.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Plan</Label>
          <Select
            defaultValue={defaultValues?.plan_id}
            onValueChange={(v) => setValue('plan_id', v)}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Selecciona un plan" />
            </SelectTrigger>
            <SelectContent className="bg-white rounded-xl border border-gray-100 shadow-xl p-1.5 min-w-32">
              {(plans ?? []).map((plan) => (
                <SelectItem key={plan.id} value={plan.id} className={selectItemClass}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.plan_id && <p className="text-xs text-red-400">{errors.plan_id.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Estatus</Label>
          <Select
            defaultValue={defaultValues?.status ?? 'trial'}
            onValueChange={(v) => setValue('status', v as TenantStatus)}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white rounded-xl border border-gray-100 shadow-xl p-1.5 min-w-32">
              {(Object.keys(STATUS_LABELS) as TenantStatus[]).map((status) => (
                <SelectItem key={status} value={status} className={selectItemClass}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isEdit && (
          <>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs font-medium text-gray-600 block mb-1.5">Nombre del propietario</Label>
              <Input className={inputClass} {...register('owner_name')} placeholder="José Martínez" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600 block mb-1.5">Correo del propietario</Label>
              <Input className={inputClass} {...register('owner_email')} type="email" placeholder="jose@tienda.com" />
              {errors.owner_email && <p className="text-xs text-red-400">{errors.owner_email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600 block mb-1.5">Contraseña inicial</Label>
              <Input className={inputClass} {...register('owner_password')} type="password" placeholder="••••••••" />
            </div>
          </>
        )}
      </div>
      <DialogFooter>
        <Button
          type="submit" disabled={isLoading}
          className="px-8 py-2.5 bg-blue-600 text-sm font-bold text-white rounded-xl transition-all shadow-md shadow-blue-600/10 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98]"
        >
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}
