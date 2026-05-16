import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import z from "zod";
import { DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { Label } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";

const productSchema = z.object({
    barcode:        z.string().trim().min(1, "El código es requerido").max(100),
    sku:            z.string().trim().min(1, "El SKU es requerido").max(100),
    name:           z.string().trim().min(1, "El nombre es requerido").max(100),
    description:    z.string().trim().max(1000).optional().or(z.literal("")),
    unit:           z.enum(["pza", "kg", "lt", "ml", "caja", "paq"]),
    price:          z.number("El precio es requerido").min(0, " El precio no puede ser negativo"),
    cost:           z.number("El costo es requerido").min(0, " El precio no puede ser negativo"),
    stock:          z.number("La cantidad disponible es requerido").min(0, " El precio no puede ser negativo"),
    min_stock:      z.number("La cantidad minima es requerida").min(0, " El precio no puede ser negativo"),
    sold_by_weight: z.boolean(),
    category_id:    z.string().uuid("La categoría no es válida").optional().nullable(),
    supplier_id:    z.string().uuid("El proveedor no es válido").optional().nullable(),
    image_url:      z.string().url("La URL de la imagen no es válida").optional().or(z.literal("")).nullable(),
})
type FormData = z.infer<typeof productSchema>;
const inputClass = 'w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 placeholder:font-normal hover:border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-50'
const selectTriggerClass = "flex w-full items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 hover:border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 text-left";
const selectItemClass = "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 px-3 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-50 focus:bg-gray-50 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-semibold";

export default function ProductForm({
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
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { sold_by_weight: false, ...defaultValues },
  });

  const soldByWeight = useWatch({ control, name: "sold_by_weight" }) ?? false;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">

            <div className="col-span-2 space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Nombre</Label>
                <Input className={inputClass} {...register("name")}  placeholder="Coca-Cola 600ml" />
                {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div className="col-span-2 space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Descripción</Label>
                <Textarea className={inputClass} {...register("description")}  placeholder="Refresco sabor cola 600ml no-retornable" />
                {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">SKU</Label>
                <Input className={inputClass} {...register("sku")}  placeholder="COCA-600" />
                {errors.sku && <p className="text-xs text-red-400">{errors.sku.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Código de barras</Label>
                <Input className={inputClass} {...register("barcode")}  placeholder="7501031311309" />
                {errors.barcode && <p className="text-xs text-red-400">{errors.barcode.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Cantidad disponible</Label>
                <Input type="number" className={inputClass} {...register("stock", { valueAsNumber: true, validate: (v) => v !== 0 || 'La cantidad no puede ser cero', })}  placeholder="48" />
                {errors.stock && <p className="text-xs text-red-400">{errors.stock.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Stock mínimo</Label>
                <Input type="number" className={inputClass} {...register("min_stock", { valueAsNumber: true })} placeholder="5" />
                {errors.min_stock && <p className="text-xs text-red-400">{errors.min_stock.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Costo</Label>
                <Input type="number" className={inputClass} {...register("cost", { valueAsNumber: true, validate: (v) => v !== 0 || 'La cantidad no puede ser cero' })}  placeholder="15" />
                {errors.cost && <p className="text-xs text-red-400">{errors.cost.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Precio al público</Label>
                <Input type="number" className={inputClass} {...register("price", { valueAsNumber: true, validate: (v) => v !== 0 || 'La cantidad no puede ser cero', })}  placeholder="22.50" />
                {errors.price && <p className="text-xs text-red-400">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Unidad</Label>
                <Select  defaultValue="pza" onValueChange={(v) => setValue("unit", v as FormData["unit"])} {...register("unit")}>
                    <SelectTrigger className={selectTriggerClass}>
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl border border-gray-100 shadow-xl p-1.5 min-w-[8rem]">
                        <SelectItem className={selectItemClass} value="pza">Pieza</SelectItem>
                        <SelectItem className={selectItemClass} value="kg">Kilo</SelectItem>
                        <SelectItem className={selectItemClass} value="lt">Litro</SelectItem>
                        <SelectItem className={selectItemClass} value="ml">Mililitro</SelectItem>
                        <SelectItem className={selectItemClass} value="caja">Caja</SelectItem>
                        <SelectItem className={selectItemClass} value="paq">Paquete</SelectItem>
                    </SelectContent>
                </Select>
                {errors.unit && <p className="text-xs text-red-400">{errors.unit.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Vender por cantidad?</Label>
                <Switch
                    checked={soldByWeight}
                    onCheckedChange={(v) => setValue("sold_by_weight", v)}
                    className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-white/20"
                />
                {errors.sold_by_weight && <p className="text-xs text-red-400">{errors.sold_by_weight.message}</p>}
            </div>

        </div>
        <DialogFooter>
            <Button type="submit" disabled={isLoading} className="px-8 py-2.5 bg-blue-600 text-sm font-bold text-white rounded-xl transition-all shadow-md shadow-blue-600/10 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98]">
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                Guardar
            </Button>
        </DialogFooter>
    </form>
  );
}
