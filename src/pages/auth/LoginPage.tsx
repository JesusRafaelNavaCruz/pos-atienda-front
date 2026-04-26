// src/pages/auth/LoginPage.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import logoPosAtienda from "@/assets/logo_pos_atienda.png";

const REMEMBER_KEY = 'pos-remember-me'

const schema = z.object({
  tenantSlug: z.string().min(1, "Ingresa el identificador de tu tienda"),
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
  rememberMe: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) ?? 'null') as {
    tenantSlug: string
    email: string
  } | null

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantSlug: saved?.tenantSlug ?? '',
      email:      saved?.email ?? '',
      rememberMe: !!saved,
    },
  });

  const onSubmit = ({ rememberMe, ...credentials }: FormData) => {
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({
        tenantSlug: credentials.tenantSlug,
        email:      credentials.email,
      }))
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }
    login(credentials)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      {/* Gradients */}
      <div className="absolute w-150 h-150 bg-indigo-600/30 rounded-full blur-3xl -top-40 -left-40"></div>
      <div className="absolute w-125 h-125 bg-cyan-500/30 rounded-full blur-3xl -buttom-32 -right-32"></div>
      <Card className="relative w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl text-white">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-slate-100 p-4 rounded-2xl w-24 shadow-lg mb-4">
              <img src={logoPosAtienda} alt="POS Atienda" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">POS Atienda</CardTitle>
          <CardDescription className="text-white/70 text-sm mt-1">
            Acceso al sistema de punto de venta
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Identificador de tienda</Label>
              <Input
                id="tenantSlug"
                placeholder="mi-tienda"
                autoCapitalize="none"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                {...register("tenantSlug")}
              />
              {errors.tenantSlug && (
                <p className="text-xs text-destructive">
                  {errors.tenantSlug.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@tienda.com"
                autoComplete="email"
                className="mt-1 w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
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
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
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
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember */}
            <div className="flex justify-between text-sm text-white/70">
              <label className="flex gap-2 items-center">
                <input type="checkbox" className="accent-indigo-500" {...register("rememberMe")} />
                Recordarme
              </label>
              <button type="button" className="hover:text-white transition">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[.98] transition-all py-3 rounded-xl font-semibold shadow-lg shadow-indigo-600/40" disabled={isLoading}>
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link
              to="/auth/register"
              className="text-primary hover:underline font-medium"
            >
              Regístrate
            </Link>
          </p>
          {/* Footer */}
          <p className="text-center text-xs text-white/50 mt-6">
            Acceso seguro • Solo personal autorizado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
