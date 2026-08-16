import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import { Label } from "../ui/badge";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Loader2 } from "lucide-react";
import type { FeatureKey } from "@/types";

const FEATURE_LABELS: Record<FeatureKey, string> = {
  card_payments:    'Pagos con tarjeta',
  csv_import:       'Importación CSV',
  scale:            'Báscula digital',
  thermal_printer:  'Impresora térmica',
  multi_branch:     'Multi-sucursal',
  advanced_reports: 'Reportes avanzados',
  api_access:       'Acceso API',
  suppliers:        'Gestión de proveedores',
  customers:        'Gestión de clientes',
  stock_alerts:     'Alertas de stock',
  basic_reports:    'Reportes básicos',
}
const FEATURE_KEYS = Object.keys(FEATURE_LABELS) as FeatureKey[]

const planSchema = z.object({
  name:             z.string().min(1, 'Nombre requerido'),
  code:             z.string().min(1, 'Código requerido'),
  price_mxn:        z.number().min(0),
  billing_interval: z.enum(['monthly', 'yearly']),
  max_users:        z.number().min(1, 'Mínimo 1'),
  max_branches:     z.number().min(1, 'Mínimo 1'),
  trial_days:       z.number().min(0),
  features:         z.record(z.string(), z.string()),
})
type FormData = z.infer<typeof planSchema>

const inputClass = 'w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 placeholder:font-normal hover:border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-50'
const selectTriggerClass = "flex w-full items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 hover:border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 text-left";
const selectItemClass = "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 px-3 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-50 focus:bg-gray-50 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-semibold";

export default function PlanForm({
  defaultValues,
  onSubmit,
  isLoading,
}: {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}) {

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      billing_interval: 'monthly',
      features: Object.fromEntries(FEATURE_KEYS.map((key) => [key, 'false'])),
      ...defaultValues,
    },
  })

  const features = watch('features')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Nombre *</Label>
          <Input className={inputClass} {...register('name')} placeholder="Plan Pro" />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Código *</Label>
          <Input className={inputClass} {...register('code')} placeholder="pro" />
          {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Precio (MXN)</Label>
          <Input className={inputClass} {...register('price_mxn', { valueAsNumber: true })} type="number" min={0} step={0.01} />
          {errors.price_mxn && <p className="text-xs text-red-400">{errors.price_mxn.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Periodicidad</Label>
          <Select
            defaultValue={defaultValues?.billing_interval ?? 'monthly'}
            onValueChange={(v) => setValue('billing_interval', v as FormData['billing_interval'])}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white rounded-xl border border-gray-100 shadow-xl p-1.5 min-w-32">
              <SelectItem value="monthly" className={selectItemClass}>Mensual</SelectItem>
              <SelectItem value="yearly" className={selectItemClass}>Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Usuarios máx.</Label>
          <Input className={inputClass} {...register('max_users', { valueAsNumber: true })} type="number" min={1} />
          {errors.max_users && <p className="text-xs text-red-400">{errors.max_users.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Sucursales máx.</Label>
          <Input className={inputClass} {...register('max_branches', { valueAsNumber: true })} type="number" min={1} />
          {errors.max_branches && <p className="text-xs text-red-400">{errors.max_branches.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Días de prueba</Label>
          <Input className={inputClass} {...register('trial_days', { valueAsNumber: true })} type="number" min={0} />
          {errors.trial_days && <p className="text-xs text-red-400">{errors.trial_days.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-600 block mb-1.5">Features incluidas</Label>
        <div className="grid grid-cols-2 gap-2">
          {FEATURE_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="text-xs font-medium text-gray-700">{FEATURE_LABELS[key]}</span>
              <Switch
                checked={features?.[key] !== 'false'}
                onCheckedChange={(checked) => setValue(`features.${key}`, checked ? 'true' : 'false')}
              />
            </div>
          ))}
        </div>
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
