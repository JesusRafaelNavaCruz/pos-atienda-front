// src/pages/auth/RegisterPage.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShoppingCart } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/api';
import isotipo from "@/assets/isotipo.png";

const schema = z.object({
  tenantName:    z.string().min(2, 'Mínimo 2 caracteres'),
  tenantSlug:    z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  ownerName:     z.string().min(2, 'Ingresa tu nombre completo'),
  ownerEmail:    z.string().email('Email inválido'),
  ownerPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  planCode:      z.enum(['basic', 'pro', 'enterprise']).default('basic'),
})

type FormData = z.infer<typeof schema>

const inputClass = 'mt-1 w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { planCode: 'basic' },
  })

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      toast.success('¡Negocio registrado! Ahora puedes iniciar sesión.')
      navigate('/auth/login')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Error al registrar'
      toast.error(msg)
    },
  })

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Gradients */}
      <div className="absolute w-150 h-150 bg-indigo-600/30 rounded-full blur-3xl -top-40 -left-40" />
      <div className="absolute w-125 h-125 bg-cyan-500/30 rounded-full blur-3xl -bottom-32 -right-32" />

      <Card className="relative w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl text-white">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-slate-100 p-4 rounded-2xl w-24 shadow-lg mb-4">
              <img src={isotipo} alt="POS Atienda" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Crear cuenta</CardTitle>
          <CardDescription className="text-white/70 text-sm mt-1">
            Registra tu negocio y empieza a vender
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">

            <div className="space-y-2">
              <Label htmlFor="tenantName">Nombre de la tienda</Label>
              <Input
                id="tenantName"
                placeholder="Abarrotes Don José"
                className={inputClass}
                {...register('tenantName')}
              />
              {errors.tenantName && <p className="text-xs text-destructive">{errors.tenantName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Identificador único</Label>
              <Input
                id="tenantSlug"
                placeholder="don-jose"
                autoCapitalize="none"
                className={inputClass}
                {...register('tenantSlug')}
              />
              <p className="text-xs text-white/50">Solo minúsculas, números y guiones. No se puede cambiar.</p>
              {errors.tenantSlug && <p className="text-xs text-destructive">{errors.tenantSlug.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">Tu nombre completo</Label>
              <Input
                id="ownerName"
                placeholder="José Martínez"
                className={inputClass}
                {...register('ownerName')}
              />
              {errors.ownerName && <p className="text-xs text-destructive">{errors.ownerName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Correo electrónico</Label>
              <Input
                id="ownerEmail"
                type="email"
                placeholder="jose@tienda.com"
                autoComplete="email"
                className={inputClass}
                {...register('ownerEmail')}
              />
              {errors.ownerEmail && <p className="text-xs text-destructive">{errors.ownerEmail.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerPassword">Contraseña</Label>
              <div className="relative">
                <Input
                  id="ownerPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={inputClass}
                  {...register('ownerPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-white/60 hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.ownerPassword && <p className="text-xs text-destructive">{errors.ownerPassword.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[.98] transition-all py-3 rounded-xl font-semibold shadow-lg shadow-indigo-600/40"
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Crear negocio
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link to="/auth/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
          {/* Footer */}
          <p className="text-center text-xs text-white/50 mt-6">
            Registro seguro • Tus datos están protegidos
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
