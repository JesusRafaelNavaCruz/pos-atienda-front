import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import { DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { Label } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/api";

const newUserSchema = z.object({
  full_name: z.string().min(2, "Nombre requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  role_id: z.string().uuid("Seleccionaun rol"),
});

type FormData = z.infer<typeof newUserSchema>;

const inputClass = 'w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-300 placeholder:font-normal hover:border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-50'
const selectTriggerClass = "flex w-full items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 hover:border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 text-left";
const selectItemClass = "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 px-3 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-50 focus:bg-gray-50 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-semibold";

export default function UserForm({
  defaultValues,
  onSubmit,
  isLoading,
}: {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}) {

    const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => usersApi.roles() })
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 block mb-1.5">Nombre completo</Label>
            <Input className={inputClass} {...register('full_name')} placeholder="Juan García" />
            {errors.full_name && <p className="text-xs text-red-400">{errors.full_name.message}</p>}
        </div>
        <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 block mb-1.5">Correo</Label>
            <Input className={inputClass} {...register('email')} type="email" placeholder="usuario@tienda.com" />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 block mb-1.5">Contraseña</Label>
            <Input className={inputClass} {...register('password')} type="password" placeholder="Mínimo 8 caracteres" />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 block mb-1.5">Rol</Label>
            <Select onValueChange={(v) => setValue('role_id', v)}>
                <SelectTrigger className={selectTriggerClass}>
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl border border-gray-100 shadow-xl p-1.5 min-w-32">
                    {(roles ?? []).map((role) => (
                    <SelectItem key={role.id} value={role.id} className={selectItemClass}>
                        {role.name}
                    </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {errors.role_id && <p className="text-xs text-red-400">{errors.role_id.message}</p>}
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
