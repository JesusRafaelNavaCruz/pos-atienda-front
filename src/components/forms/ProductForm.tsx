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
import BarcodeGenerator from "../shared/BarcodeGenerator";

const productSchema = z.object({
    barcode:        z.string().trim().min(1, "El código es requerido").max(100),
    sku:            z.string().trim().min(1, "El SKU es requerido").max(100),
    name:           z.string().trim().min(1, "El nombre es requerido").max(100),
    description:    z.string().trim().max(1000).optional().or(z.literal("")),
    unit:           z.enum(["pza", "kg", "g", "lt", "ml", "caja", "paq", "rollo", "par"]),
    price:          z.number("El precio es requerido").min(0, " El precio no puede ser negativo"),
    cost:           z.number("El costo es requerido").min(0, " El precio no puede ser negativo"),
    stock:          z.number("La cantidad disponible es requerido").min(0, " El precio no puede ser negativo"),
    min_stock:      z.number("La cantidad minima es requerida").min(0, " El precio no puede ser negativo"),
    category_id:    z.string().uuid("La categoría no es válida").optional().nullable(),
    supplier_id:    z.string().uuid("El proveedor no es válido").optional().nullable(),
    image_url:      z.string().url("La URL de la imagen no es válida").optional().or(z.literal("")).nullable(),
})
type FormData = z.infer<typeof productSchema>;

// "Vender por cantidad" (sold_by_weight) ya no es un campo aparte: se deriva
// de la unidad elegida. kg/g/lt/ml son unidades a granel (fraccionarias);
// el resto se vende por pieza entera. Mismo criterio que BarcodesPage.
const WEIGHT_UNITS: FormData["unit"][] = ["kg", "g", "lt", "ml"];
const isWeightUnit = (unit: FormData["unit"]) => WEIGHT_UNITS.includes(unit);

const UNIT_LABELS: Record<FormData["unit"], string> = {
  pza:  "Pieza",
  kg:   "Kilo",
  g:    "Gramo",
  lt:   "Litro",
  ml:   "Mililitro",
  caja: "Caja",
  paq:  "Paquete",
  rollo: "Rollo",
  par:  "Par",
};
const UNIT_VALUES = Object.keys(UNIT_LABELS) as FormData["unit"][];

// Lo que efectivamente se envía al guardar: los campos del formulario más
// sold_by_weight, calculado a partir de la unidad (nunca se pide a mano).
export type ProductFormOutput = FormData & { sold_by_weight: boolean };

const inputClass = 'w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 placeholder:font-normal hover:border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-50'
const selectTriggerClass = "flex w-full items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 hover:border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 text-left";
const selectItemClass = "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 px-3 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-50 focus:bg-gray-50 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-semibold";

export default function ProductForm({
  defaultValues,
  onSubmit,
  isLoading,
  tenantId = "T1"
}: {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: ProductFormOutput) => void;
  isLoading: boolean;
  tenantId?: string,
}) {
  const {
    register,
    setValue,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { unit: "pza", ...defaultValues },
  });

  const sku = useWatch({ control, name: "sku" }) ?? "";
  const barcode = useWatch({ control, name: "barcode" }) ?? "";
  const unit = useWatch({ control, name: "unit" }) ?? "pza";
  const soldByWeight = isWeightUnit(unit);

  const submit = handleSubmit((data) => {
    onSubmit({ ...data, sold_by_weight: isWeightUnit(data.unit) });
  });

  return (
    <form onSubmit={submit} className="space-y-4">
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

                <div className="flex gap-2">
                    <Input className={inputClass} {...register("barcode")} placeholder="7501031311309" />
                    <BarcodeGenerator
                      tenantId={tenantId}
                      sku={sku}
                      existingBarcode={barcode}
                      onGenerated={(nuevoCodigo) => {
                        // Cambiamos el valor nativamente en el formulario y disparamos la validación de Zod
                        setValue("barcode", nuevoCodigo, { shouldValidate: true });
                      }}
                    />
                </div>
                {errors.barcode && <p className="text-xs text-red-400">{errors.barcode.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Cantidad disponible</Label>
                <Input
                  type="number"
                  step={soldByWeight ? "0.001" : "1"}
                  className={inputClass}
                  {...register("stock", { valueAsNumber: true, validate: (v) => v !== 0 || 'La cantidad no puede ser cero', })}
                  placeholder={soldByWeight ? "23.500" : "48"}
                />
                {errors.stock && <p className="text-xs text-red-400">{errors.stock.message}</p>}
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Stock mínimo</Label>
                <Input
                  type="number"
                  step={soldByWeight ? "0.001" : "1"}
                  className={inputClass}
                  {...register("min_stock", { valueAsNumber: true })}
                  placeholder="5"
                />
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
            <div className="col-span-2 space-y-2">
                <Label className="text-xs font-medium text-gray-600 block mb-1.5">Unidad</Label>
                <Select
                  value={unit}
                  onValueChange={(v) => setValue("unit", v as FormData["unit"], { shouldValidate: true })}
                >
                    <SelectTrigger className={selectTriggerClass}>
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl border border-gray-100 shadow-xl p-1.5 min-w-32">
                        {UNIT_VALUES.map((u) => (
                          <SelectItem key={u} className={selectItemClass} value={u}>{UNIT_LABELS[u]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.unit && <p className="text-xs text-red-400">{errors.unit.message}</p>}
                <p className="text-xs text-gray-400">
                  {soldByWeight
                    ? "Se vende a granel: la cantidad admite decimales (ej. 0.500 kg)."
                    : "Se vende por pieza: la cantidad es un número entero."}
                </p>
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
