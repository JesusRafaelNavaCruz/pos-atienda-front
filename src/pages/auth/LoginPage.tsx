// src/pages/auth/LoginPage.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Loader2, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  tenantSlug: z.string().min(1, 'Ingresa el identificador de tu tienda'),
  email:      z.string().email('Email inválido'),
  password:   z.string().min(1, 'Ingresa tu contraseña'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login, isLoading } = useAuth()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="size-12 rounded-xl bg-primary flex items-center justify-center">
              <Store className="size-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">POS Abarrotes</CardTitle>
          <CardDescription>Inicia sesión para continuar</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit((data) => login(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Identificador de tienda</Label>
              <Input
                id="tenantSlug"
                placeholder="mi-tienda"
                autoCapitalize="none"
                {...register('tenantSlug')}
              />
              {errors.tenantSlug && (
                <p className="text-xs text-destructive">{errors.tenantSlug.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@tienda.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link to="/auth/register" className="text-primary hover:underline font-medium">
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
