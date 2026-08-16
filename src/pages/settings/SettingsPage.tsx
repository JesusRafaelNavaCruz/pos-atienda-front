// src/pages/settings/SettingsPage.tsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, CreditCard, Users, Shield, ExternalLink, HandCoins } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Can } from '@/components/layout/Guards'
import { useAuth } from '@/hooks/useAuth'
import { usersApi, subscriptionsApi } from '@/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { User, Plan } from '@/types'
import UserForm from '@/components/forms/UserForm'
import PaymentSuppliers from '@/components/tabsContent/PaymentSuppliers'

const glassCard  = 'backdrop-blur-xl bg-slate-800/75 border border-white/10 shadow-2xl text-white'

// ─── Usuarios ────────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { toast.success('Usuario creado'); qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false); },
    onError: () => toast.error('Error al crear usuario'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => usersApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: () => toast.error('No se pudo actualizar el usuario'),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Can resource="users" action="create">
          <Button
            onClick={() => setOpen(true)} size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
          >
            <Plus className="size-4" /> Nuevo usuario
          </Button>
        </Can>
      </div>

      <Card className={glassCard}>
        <CardContent className="p-0 divide-y divide-white/10">
          {isLoading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="size-9 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40 bg-white/10" />
                    <Skeleton className="h-3 w-24 bg-white/10" />
                  </div>
                </div>
              ))
            : (users ?? []).map((user: User) => (
                <div key={user.id} className="flex items-center gap-4 p-4">
                  <div className="size-9 rounded-full bg-indigo-600/30 flex items-center justify-center text-sm font-semibold text-indigo-300 shrink-0">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{user.full_name}</p>
                    <p className="text-xs text-white/50">{user.email}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize text-xs bg-white/10 text-white/70 border-white/10">
                    {user.role.name}
                  </Badge>
                  <Can resource="users" action="update">
                    {!user.role?.code?.includes('owner') && (
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: user.id, is_active: v })}
                      />
                    )}
                  </Can>
                </div>
              ))
          }
        </CardContent>
      </Card>

      {/* Dialog Create User */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-xl w-full space-y-4">
          <DialogHeader>
            <DialogTitle className='text-xl font-bold text-gray-900 tracking-tight'>Nuevo usuario</DialogTitle>
          </DialogHeader> 
          <UserForm onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ─── Roles ────────────────────────────────────────────────────────────────────

function RolesTab() {
  const { data: roles, isLoading } = useQuery({ queryKey: ['roles'], queryFn: () => usersApi.roles() })

  return (
    <div className="space-y-3">
      {isLoading
        ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl bg-slate-800/75" />)
        : (roles ?? []).map((role) => (
            <Card key={role.id} className={glassCard}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-indigo-600/30 flex items-center justify-center">
                      <Shield className="size-4 text-indigo-300" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-white">{role.name}</p>
                      <p className="text-xs text-white/50 font-mono">{role.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {role.is_system && (
                      <Badge variant="secondary" className="text-xs bg-white/10 text-white/60 border-white/10">
                        Sistema
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                      {role._count?.users ?? 0} usuarios
                    </Badge>
                  </div>
                </div>
                {role?.permissions && role.permissions?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {role.permissions.map((rp) => (
                      <span
                        key={rp?.permission_id}
                        className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full"
                      >
                        {rp?.permission?.resource}:{rp?.permission?.action}
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

// ─── Suscripción ─────────────────────────────────────────────────────────────

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
    mutationFn: () => subscriptionsApi.portal({ return_url: window.location.href }),
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
        <Skeleton className="h-32 w-full rounded-xl bg-slate-800/75" />
        <Skeleton className="h-48 w-full rounded-xl bg-slate-800/75" />
      </div>
    )
  }

  const sub   = data?.subscription
  const plan  = data?.plan
  const usage = data?.usage as any

  return (
    <div className="space-y-6">
      {/* Plan actual */}
      {plan && sub && (
        <Card className={glassCard}>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle className="text-white">{plan.name}</CardTitle>
              <CardDescription className="text-white/50">
                {formatCurrency(plan.price_mxn)}/{plan.billing_interval === 'monthly' ? 'mes' : 'año'}
              </CardDescription>
            </div>
            <Badge variant={STATUS_VARIANT[sub.status] ?? 'secondary'}>
              {STATUS_LABELS[sub.status] ?? sub.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {sub.trialEndsAt && (
              <p className="text-sm text-white/60">
                Período de prueba hasta: <span className="font-medium text-white">{formatDate(sub.trialEndsAt)}</span>
              </p>
            )}
            {sub.currentPeriodEnd && sub.status === 'active' && (
              <p className="text-sm text-white/60">
                Próxima renovación: <span className="font-medium text-white">{formatDate(sub.currentPeriodEnd)}</span>
              </p>
            )}

            {/* Uso */}
            {usage && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                {[
                  { label: 'Usuarios',   current: usage.users.current,    max: usage.users.max },
                  { label: 'Sucursales', current: usage.branches.current,  max: usage.branches.max },
                ].map(({ label, current, max }) => (
                  <div key={label}>
                    <p className="text-xs text-white/50">{label}</p>
                    <p className="text-sm font-medium text-white">
                      {current} / {max === 999 ? '∞' : max}
                    </p>
                    <div className="h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min((current / max) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Features del plan */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
              {Object.entries(plan.features).map(([key, value]) => {
                const enabled = value !== 'false' && value !== '0'
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`size-1.5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    <span className={`text-xs ${enabled ? 'text-white/80' : 'text-white/30 line-through'}`}>
                      {FEATURE_LABELS[key] ?? key}
                    </span>
                  </div>
                )
              })}
            </div>

            {isOwner && sub.status !== 'canceled' && (
              <Button
                variant="outline" size="sm"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="border-white/20 bg-transparent hover:bg-white/10 text-white/80 hover:text-white"
              >
                {portalMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                <CreditCard className="size-4" /> Gestionar facturación
                <ExternalLink className="size-3 opacity-50" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Otros planes */}
      {isOwner && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Cambiar plan</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(plans ?? [])
              .filter((p) => p.code !== plan?.code)
              .map((p: Plan) => (
                <Card key={p.id} className={glassCard}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white">{p.name}</CardTitle>
                    <CardDescription className="text-white/50">
                      {formatCurrency(p.price_mxn)}/mes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className={`w-full ${p.code === 'enterprise' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30' : 'border-white/20 bg-white/10 hover:bg-white/20 text-white'}`}
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

// ─── Página ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { isOwner } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // El tab activo vive en la URL (?tab=) para poder regresar aquí desde flujos
  // externos, como el checkout de Stripe o el callback OAuth de Mercado Pago.
  const availableTabs = ['users', ...(isOwner ? ['roles', 'subscription', 'paymentSuppliers'] : [])]
  const requestedTab = searchParams.get('tab')
  const activeTab = requestedTab && availableTabs.includes(requestedTab) ? requestedTab : 'users'

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', value)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Configuración" description="Gestiona usuarios, roles y tu suscripción" />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
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
          {isOwner && (
            <TabsTrigger value="paymentSuppliers" className="gap-2">
              <HandCoins className="size-4" /> Pagos
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users"><UsersTab /></TabsContent>
        {isOwner && <TabsContent value="roles"><RolesTab /></TabsContent>}
        {isOwner && <TabsContent value="subscription"><SubscriptionTab /></TabsContent>}
        {isOwner && <TabsContent value="paymentSuppliers"><PaymentSuppliers /></TabsContent>}
      </Tabs>
    </div>
  )
}
