// src/pages/settings/SettingsPage.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2, CreditCard, Users, Shield, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/badge'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Can } from '@/components/layout/Guards'
import { useAuth } from '@/hooks/useAuth'
import { usersApi, subscriptionsApi } from '@/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { User, Plan } from '@/types'

// ─── Subcomponente: lista de usuarios ────────────────────────────────────────

const newUserSchema = z.object({
  full_name: z.string().min(2, 'Nombre requerido'),
  email:     z.string().email('Email inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  role_id:   z.string().uuid('Selecciona un rol'),
})
type NewUserData = z.infer<typeof newUserSchema>

function UsersTab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: users, isLoading }  = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  })
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: usersApi.roles,
  })

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<NewUserData>({
    resolver: zodResolver(newUserSchema),
  })

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      toast.success('Usuario creado')
      qc.invalidateQueries({ queryKey: ['users'] })
      setOpen(false)
      reset()
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.error?.message ?? 'Error al crear usuario'
      toast.error(msg)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      usersApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: () => toast.error('No se pudo actualizar el usuario'),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Can resource="users" action="create">
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="size-4" /> Nuevo usuario
          </Button>
        </Can>
      </div>

      <div className="rounded-md border divide-y">
        {isLoading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          : (users ?? []).map((user: User) => (
              <div key={user.id} className="flex items-center gap-4 p-4">
                <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="secondary" className="capitalize text-xs">
                  {user.role.name}
                </Badge>
                <Can resource="users" action="update">
                  {!user.role.code.includes('owner') && (
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: user.id, is_active: v })}
                    />
                  )}
                </Can>
              </div>
            ))
        }
      </div>

      {/* Modal nuevo usuario */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input {...register('full_name')} placeholder="Juan García" />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Correo *</Label>
              <Input {...register('email')} type="email" placeholder="usuario@tienda.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Contraseña *</Label>
              <Input {...register('password')} type="password" placeholder="Mínimo 8 caracteres" />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select onValueChange={(v) => setValue('role_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {(roles ?? []).map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role_id && <p className="text-xs text-destructive">{errors.role_id.message}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Crear usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Subcomponente: roles y permisos ─────────────────────────────────────────

function RolesTab() {
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: usersApi.roles,
  })

  return (
    <div className="space-y-3">
      {isLoading
        ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
        : (roles ?? []).map((role) => (
            <Card key={role.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{role.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{role.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {role.is_system && (
                      <Badge variant="secondary" className="text-xs">Sistema</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {role._count?.users ?? 0} usuarios
                    </Badge>
                  </div>
                </div>
                {role.permissions && role.permissions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {role.permissions.map((rp) => (
                      <span
                        key={rp.permission_id}
                        className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                      >
                        {rp.permission.resource}:{rp.permission.action}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
      }
    </div>
  )
}

// ─── Subcomponente: suscripción ───────────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
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

function SubscriptionTab() {
  const { isOwner } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
  })

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: subscriptionsApi.plans,
  })

  const portalMutation = useMutation({
    mutationFn: () =>
      subscriptionsApi.portal({ return_url: window.location.href }),
    onSuccess: ({ portalUrl }) => window.open(portalUrl, '_blank'),
    onError: () => toast.error('No se pudo abrir el portal de facturación'),
  })

  const checkoutMutation = useMutation({
    mutationFn: (plan_code: string) =>
      subscriptionsApi.checkout({
        plan_code,
        success_url: `${window.location.origin}/app/settings?tab=subscription&upgraded=1`,
        cancel_url:  window.location.href,
      }),
    onSuccess: ({ checkoutUrl }) => window.open(checkoutUrl, '_blank'),
    onError: () => toast.error('No se pudo iniciar el proceso de pago'),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  const sub  = data?.subscription
  const plan = data?.plan
  const usage = data?.usage as any

  const STATUS_LABELS: Record<string, string> = {
    active:   'Activo',
    trialing: 'Prueba gratuita',
    past_due: 'Pago vencido',
    canceled: 'Cancelado',
    unpaid:   'Sin pagar',
  }
  const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    active:   'success',
    trialing: 'secondary',
    past_due: 'warning',
    canceled: 'destructive',
    unpaid:   'destructive',
  }

  return (
    <div className="space-y-6">
      {/* Plan actual */}
      {plan && sub && (
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                {formatCurrency(plan.price_mxn)}/{plan.billing_interval === 'monthly' ? 'mes' : 'año'}
              </CardDescription>
            </div>
            <Badge variant={STATUS_VARIANT[sub.status] ?? 'secondary'}>
              {STATUS_LABELS[sub.status] ?? sub.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {sub.trialEndsAt && (
              <p className="text-sm text-muted-foreground">
                Período de prueba hasta: <span className="font-medium">{formatDate(sub.trialEndsAt)}</span>
              </p>
            )}
            {sub.currentPeriodEnd && sub.status === 'active' && (
              <p className="text-sm text-muted-foreground">
                Próxima renovación: <span className="font-medium">{formatDate(sub.currentPeriodEnd)}</span>
              </p>
            )}

            {/* Uso */}
            {usage && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Usuarios</p>
                  <p className="text-sm font-medium">
                    {usage.users.current} / {usage.users.max === 999 ? '∞' : usage.users.max}
                  </p>
                  <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min((usage.users.current / usage.users.max) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sucursales</p>
                  <p className="text-sm font-medium">
                    {usage.branches.current} / {usage.branches.max === 999 ? '∞' : usage.branches.max}
                  </p>
                  <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min((usage.branches.current / usage.branches.max) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2">
              {Object.entries(plan.features).map(([key, value]) => {
                const enabled = value !== 'false' && value !== '0'
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`size-1.5 rounded-full ${enabled ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                    <span className={`text-xs ${enabled ? '' : 'text-muted-foreground line-through'}`}>
                      {FEATURE_LABELS[key] ?? key}
                    </span>
                  </div>
                )
              })}
            </div>

            {isOwner && sub.status !== 'canceled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                <CreditCard className="size-4" /> Gestionar facturación
                <ExternalLink className="size-3 opacity-50" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Otros planes (upgrade) */}
      {isOwner && (
        <div>
          <p className="text-sm font-medium mb-3">Cambiar plan</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(plans ?? [])
              .filter((p) => p.code !== plan?.code)
              .map((p: Plan) => (
                <Card key={p.id} className="relative">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <CardDescription>
                      {formatCurrency(p.price_mxn)}/mes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      size="sm"
                      variant={p.code === 'enterprise' ? 'default' : 'outline'}
                      onClick={() => checkoutMutation.mutate(p.code)}
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                      {(plan?.price_mxn ?? 0) < p.price_mxn ? 'Actualizar' : 'Cambiar'} a {p.name}
                    </Button>
                  </CardContent>
                </Card>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal de configuración ───────────────────────────────────────

export default function SettingsPage() {
  const { isOwner } = useAuth()

  return (
    <div className="p-6">
      <PageHeader
        title="Configuración"
        description="Gestiona usuarios, roles y tu suscripción"
      />

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="size-4" /> Usuarios
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="size-4" /> Roles
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger value="subscription" className="gap-2">
              <CreditCard className="size-4" /> Suscripción
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        {isOwner && (
          <TabsContent value="roles">
            <RolesTab />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="subscription">
            <SubscriptionTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
