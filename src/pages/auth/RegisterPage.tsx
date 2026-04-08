// src/pages/auth/RegisterPage.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Store } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/api'

const schema = z.object({
  tenantName:    z.string().min(2, 'Mínimo 2 caracteres'),
  tenantSlug:    z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  ownerName:     z.string().min(2, 'Ingresa tu nombre completo'),
  ownerEmail:    z.string().email('Email inválido'),
  ownerPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  planCode:      z.enum(['basic', 'pro', 'enterprise']).default('basic'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()

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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="size-12 rounded-xl bg-primary flex items-center justify-center">
              <Store className="size-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Crear cuenta</CardTitle>
          <CardDescription>Registra tu negocio y empieza gratis 14 días</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Nombre de la tienda</Label>
              <Input id="tenantName" placeholder="Abarrotes Don José" {...register('tenantName')} />
              {errors.tenantName && <p className="text-xs text-destructive">{errors.tenantName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Identificador único</Label>
              <Input id="tenantSlug" placeholder="don-jose" autoCapitalize="none" {...register('tenantSlug')} />
              <p className="text-xs text-muted-foreground">Solo minúsculas, números y guiones. No se puede cambiar.</p>
              {errors.tenantSlug && <p className="text-xs text-destructive">{errors.tenantSlug.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">Tu nombre completo</Label>
              <Input id="ownerName" placeholder="José Martínez" {...register('ownerName')} />
              {errors.ownerName && <p className="text-xs text-destructive">{errors.ownerName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Correo electrónico</Label>
              <Input id="ownerEmail" type="email" placeholder="jose@tienda.com" {...register('ownerEmail')} />
              {errors.ownerEmail && <p className="text-xs text-destructive">{errors.ownerEmail.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerPassword">Contraseña</Label>
              <Input id="ownerPassword" type="password" {...register('ownerPassword')} />
              {errors.ownerPassword && <p className="text-xs text-destructive">{errors.ownerPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
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
        </CardContent>
      </Card>
    </div>
  )
}
