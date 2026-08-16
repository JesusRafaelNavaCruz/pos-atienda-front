// src/pages/admin/auth/AdminLoginPage.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useState } from "react";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

type FormData = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const { login, isLoading } = useAdminAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (credentials: FormData) => login(credentials);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      {/* Gradients */}
      <div className="absolute w-150 h-150 bg-rose-600/30 rounded-full blur-3xl -top-40 -left-40"></div>
      <div className="absolute w-125 h-125 bg-amber-500/30 rounded-full blur-3xl -bottom-32 -right-32"></div>
      <Card className="relative w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl text-white">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-slate-100 p-4 rounded-2xl w-16 shadow-lg mb-4">
              <ShieldCheck className="size-8 text-rose-600 mx-auto" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Panel SuperAdmin</CardTitle>
          <CardDescription className="text-white/70 text-sm mt-1">
            Acceso exclusivo para administradores de la plataforma
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@tuempresa.com"
                autoComplete="email"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-rose-500 transition"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-white/60 hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-500 active:scale-[.98] transition-all py-3 rounded-xl font-semibold shadow-lg shadow-rose-600/40"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>

          <p className="text-center text-xs text-white/50 mt-6">
            Acceso seguro • Solo personal autorizado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
