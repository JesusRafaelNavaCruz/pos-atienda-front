import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import { Label } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";

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

const inputClass = 'w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 placeholder:font-normal hover:border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-50'

export default function SupplierForm({
    defaultValues,
    onSubmit,
    isLoading,
}: {
    defaultValues?: Partial<FormData>;
    onSubmit: (data: FormData) => void;
    isLoading: boolean;
}) {

    const { register, handleSubmit, formState: {errors} } = useForm<FormData>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {...defaultValues}
    })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Nombre del proveedor *</Label>
          <Input
            className={inputClass}
            {...register("name")}
            placeholder="Distribuidora XYZ"
          />
          {errors.name && (
            <p className="text-xs text-red-400">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Contacto</Label>
          <Input
            className={inputClass}
            {...register("contact_name")}
            placeholder="Juan Pérez"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">RFC</Label>
          <Input
            className={inputClass}
            {...register("rfc")}
            placeholder="XAXX010101000"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Teléfono</Label>
          <Input
            className={inputClass}
            {...register("phone")}
            placeholder="55 1234 5678"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Correo</Label>
          <Input
            className={inputClass}
            {...register("email")}
            type="email"
            placeholder="ventas@proveedor.com"
          />
          {errors.email && (
            <p className="text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>
        <div className="col-span-2 space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Dirección</Label>
          <Input
            className={inputClass}
            {...register("address")}
            placeholder="Calle, colonia, ciudad"
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label className="text-xs font-medium text-gray-600 block mb-1.5">Notas</Label>
          <Textarea
            className={`${inputClass} resize-none`}
            {...register("notes")}
            placeholder="Días de entrega, condiciones de pago..."
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          type="submit"
          disabled={isLoading}
          className="px-8 py-2.5 bg-blue-600 text-sm font-bold text-white rounded-xl transition-all shadow-md shadow-blue-600/10 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98]"
        >
          {isLoading && <Loader2 className="size-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}
