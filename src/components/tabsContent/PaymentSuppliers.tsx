// src/components/tabsContent/PaymentSuppliers.tsx
// Vista de proveedores de pago. Hoy solo Mercado Pago tiene integración real
// (vinculación OAuth para Terminales Smart), pero el panel está pensado como
// un registro: agregar un proveedor nuevo es sumar una entrada a PROVIDERS y,
// cuando tenga integración propia, un panel de detalle como MercadoPagoDetail.

import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ChevronRight,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Unlink,
  Building2,
  Landmark,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useHasFeature } from '@/hooks/useAuth'
import { mercadoPagoApi } from '@/api'
import { cn, formatDateTime } from '@/lib/utils'
import type { MercadoPagoConnection } from '@/types'

type ProviderStatus = 'connected' | 'not-connected' | 'locked' | 'coming-soon'

interface PaymentProvider {
  id: string
  name: string
  description: string
  icon: () => ReactNode
  comingSoon?: boolean
}

function MercadoPagoIcon() {
  return (
    <svg width="36" height="25" viewBox="0 0 288 199" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M143.65 3.72998C65.82 3.72998 2.73999 44.09 2.73999 93.88C2.73999 143.67 65.83 187.93 143.65 187.93C221.47 187.93 284.56 143.66 284.56 93.88C284.56 44.1 221.47 3.72998 143.65 3.72998Z" fill="#00BCFF"/>
      <path d="M97.8 66.01C97.73 66.15 96.35 67.57 97.25 68.72C99.43 71.5 106.16 73.1 112.97 71.57C117.02 70.66 122.22 66.53 127.25 62.54C132.7 58.21 138.11 53.87 143.55 52.15C149.31 50.32 153 51.1 155.44 51.84C158.11 52.64 161.26 54.4 166.28 58.16C175.73 65.26 213.71 98.42 220.28 104.15C225.56 101.76 250.75 91.59 282.67 84.55C279.89 67.53 269.66 51.3 253.95 38.56C232.06 47.75 203.53 53.26 177.37 40.49C177.24 40.44 163.08 33.74 149.12 34.07C128.37 34.55 119.38 43.53 109.87 53.04L97.82 66.03L97.8 66.01Z" fill="white"/>
      <path d="M218.71 107.76C218.26 107.36 174.04 68.6701 164.02 61.1401C158.22 56.7901 155 55.6801 151.61 55.2501C149.85 55.0201 147.41 55.3501 145.71 55.8201C141.05 57.0901 134.96 61.1601 129.55 65.4501C123.95 69.9101 118.67 74.1101 113.76 75.2101C107.5 76.6101 99.8501 74.9601 96.3601 72.6001C94.9501 71.6501 93.9501 70.5501 93.4701 69.4401C92.1801 66.4501 94.5601 64.0601 94.9501 63.6601L107.15 50.4601C108.57 49.0501 110 47.6301 111.46 46.2301C107.52 46.7401 103.88 47.7501 100.34 48.7301C95.9201 49.9701 91.6601 51.1501 87.3601 51.1501C85.5601 51.1501 75.9401 49.5701 74.1101 49.0801C63.0601 46.0601 50.5501 43.1101 36.0701 36.3501C18.7201 49.2601 7.42007 65.1201 4.07007 82.9101C6.56007 83.5701 13.0901 85.0601 14.7801 85.4301C54.0401 94.1601 66.2701 103.15 68.4901 105.03C70.8901 102.36 74.3601 100.67 78.2201 100.67C82.5701 100.67 86.4801 102.86 88.8601 106.23C91.1101 104.45 94.2101 102.93 98.2201 102.94C100.04 102.94 101.93 103.28 103.84 103.92C108.27 105.44 110.56 108.39 111.74 111.06C113.22 110.39 115.05 109.89 117.2 109.9C119.32 109.9 121.52 110.38 123.73 111.34C130.97 114.45 132.09 121.56 131.44 126.92C131.96 126.86 132.48 126.84 133 126.84C141.58 126.84 148.56 133.82 148.56 142.41C148.56 145.07 147.88 147.57 146.7 149.76C149.04 151.07 154.99 154.04 160.22 153.38C164.39 152.85 165.98 151.43 166.54 150.62C166.93 150.07 167.34 149.42 166.96 148.96L155.88 136.66C155.88 136.66 154.06 134.93 154.66 134.27C155.28 133.59 156.41 134.57 157.21 135.23C162.85 139.94 169.73 147.04 169.73 147.04C169.85 147.12 170.3 148.02 172.85 148.47C175.04 148.86 178.92 148.64 181.61 146.43C182.28 145.87 182.96 145.18 183.54 144.46C183.49 144.5 183.45 144.54 183.41 144.56C186.25 140.93 183.09 137.27 183.09 137.27L170.16 122.75C170.16 122.75 168.31 121.04 168.94 120.35C169.5 119.75 170.69 120.65 171.5 121.33C175.59 124.75 181.38 130.56 186.92 135.99C188.01 136.78 192.88 139.79 199.33 135.56C203.25 132.99 204.03 129.83 203.92 127.46C203.65 124.31 201.19 122.06 201.19 122.06L183.53 104.3C183.53 104.3 181.66 102.71 182.32 101.9C182.86 101.22 184.07 102.2 184.87 102.86C190.49 107.57 205.73 121.54 205.73 121.54C205.95 121.69 211.21 125.44 217.72 121.3C220.05 119.81 221.53 117.57 221.66 114.96C221.88 110.44 218.7 107.76 218.7 107.76H218.71Z" fill="white"/>
      <path d="M133.03 130.27C130.29 130.24 127.29 131.87 126.9 131.63C126.68 131.49 127.07 130.39 127.32 129.75C127.59 129.12 131.19 118.27 122.4 114.5C115.67 111.61 111.55 114.86 110.14 116.33C109.77 116.71 109.6 116.68 109.56 116.2C109.42 114.24 108.55 108.96 102.74 107.18C94.4401 104.64 89.1001 110.43 87.7501 112.53C87.1401 107.8 83.1401 104.13 78.2501 104.12C72.9301 104.12 68.6101 108.42 68.6001 113.75C68.6001 119.07 72.9101 123.39 78.2401 123.39C80.8301 123.39 83.1701 122.36 84.9001 120.7C84.9601 120.75 84.9801 120.84 84.9501 121.02C84.5401 123.41 83.8001 132.06 92.8701 135.59C96.5101 137 99.6001 135.95 102.16 134.16C102.92 133.62 103.05 133.85 102.94 134.57C102.61 136.8 103.03 141.56 109.71 144.27C114.79 146.34 117.8 144.23 119.78 142.4C120.64 141.62 120.87 141.75 120.92 142.96C121.16 149.4 126.51 154.52 133.01 154.53C139.71 154.53 145.14 149.12 145.14 142.43C145.14 135.73 139.72 130.37 133.02 130.3L133.03 130.27Z" fill="white"/>
      <path d="M143.62 0C64.31 0 0.0200043 42.18 0.0200043 93.92C0.0200043 95.26 0 98.95 0 99.42C0 154.32 56.19 198.77 143.6 198.77C231.01 198.77 287.21 154.32 287.21 99.43V93.92C287.21 42.18 222.92 0 143.62 0ZM280.74 83.51C249.53 90.45 226.25 100.52 220.42 103.12C206.8 91.23 175.32 63.86 166.79 57.46C161.92 53.79 158.59 51.86 155.67 50.99C154.36 50.59 152.55 50.14 150.22 50.14C148.05 50.14 145.72 50.53 143.29 51.31C137.78 53.06 132.29 57.42 126.98 61.64L126.71 61.86C121.76 65.79 116.65 69.86 112.78 70.72C111.09 71.1 109.35 71.3 107.62 71.3C103.28 71.3 99.39 70.04 97.93 68.18C97.69 67.87 97.85 67.37 98.41 66.66L98.48 66.56L110.47 53.65C119.86 44.26 128.72 35.4 149.13 34.93C149.47 34.92 149.81 34.91 150.15 34.91C162.85 34.92 175.55 40.6 176.98 41.27C188.89 47.08 201.19 50.03 213.54 50.04C226.39 50.04 239.65 46.87 253.59 40.46C268.15 52.7 277.8 67.45 280.74 83.52V83.51ZM143.64 5.54C185.74 5.54 223.4 17.61 248.73 36.61C236.49 41.91 224.82 44.58 213.56 44.58C202.04 44.57 190.53 41.8 179.35 36.35C178.76 36.07 164.74 29.46 150.15 29.45C149.77 29.45 149.38 29.45 149 29.46C131.86 29.86 122.2 35.95 115.71 41.28C109.4 41.44 103.95 42.96 99.1 44.31C94.77 45.51 91.04 46.55 87.4 46.55C85.9 46.55 83.2 46.41 82.96 46.4C78.78 46.27 57.78 41.12 41.01 34.79C66.28 16.83 102.9 5.53 143.65 5.53L143.64 5.54ZM36.03 38.55C53.54 45.71 74.79 51.25 81.51 51.68C83.38 51.8 85.38 52.02 87.38 52.02C91.84 52.02 96.29 50.77 100.59 49.57C103.13 48.86 105.94 48.08 108.89 47.52C108.1 48.29 107.31 49.08 106.52 49.87L94.35 63.04C93.39 64.01 91.31 66.59 92.68 69.77C93.22 71.05 94.33 72.28 95.88 73.32C98.78 75.27 103.98 76.6 108.8 76.6C110.63 76.6 112.37 76.42 113.95 76.06C119.06 74.92 124.41 70.65 130.08 66.14C134.6 62.55 141.02 57.99 145.94 56.65C147.32 56.28 149 56.04 150.36 56.04C150.77 56.04 151.15 56.06 151.5 56.11C154.74 56.52 157.88 57.62 163.49 61.83C173.49 69.34 217.71 108.03 218.14 108.41C218.17 108.43 220.99 110.87 220.79 114.91C220.68 117.17 219.43 119.17 217.25 120.56C215.36 121.76 213.42 122.37 211.45 122.37C208.49 122.37 206.46 120.98 206.32 120.89C206.16 120.76 191.01 106.86 185.43 102.19C184.54 101.45 183.68 100.79 182.81 100.79C182.34 100.79 181.93 100.99 181.65 101.34C180.77 102.42 181.75 103.92 182.91 104.9L200.61 122.7C200.61 122.7 202.82 124.76 203.06 127.49C203.2 130.44 201.79 132.91 198.86 134.83C196.77 136.21 194.66 136.9 192.59 136.9C189.87 136.9 187.96 135.66 187.54 135.37L185 132.87C180.36 128.3 175.57 123.58 172.06 120.66C171.2 119.95 170.29 119.29 169.42 119.29C168.99 119.29 168.6 119.45 168.3 119.77C167.9 120.21 167.62 121.01 168.62 122.34C169.02 122.89 169.51 123.34 169.51 123.34L182.42 137.85C182.52 137.98 185.08 141.02 182.71 144.04L182.25 144.62C181.86 145.04 181.45 145.44 181.05 145.78C178.85 147.59 175.91 147.78 174.74 147.78C174.11 147.78 173.52 147.73 172.99 147.63C171.72 147.4 170.86 147.05 170.44 146.56L170.28 146.4C169.58 145.67 163.07 139.02 157.68 134.53C156.97 133.93 156.08 133.19 155.17 133.19C154.72 133.19 154.32 133.37 154 133.71C152.94 134.88 154.54 136.62 155.22 137.26L166.23 149.41C166.22 149.52 166.08 149.77 165.82 150.15C165.42 150.7 164.09 152.03 160.09 152.53C159.61 152.59 159.11 152.62 158.63 152.62C154.51 152.62 150.11 150.62 147.84 149.42C148.87 147.24 149.41 144.84 149.41 142.44C149.41 133.37 142.05 126 132.98 125.99C132.79 125.99 132.58 125.99 132.39 126C132.68 121.86 132.1 114.02 124.05 110.57C121.73 109.57 119.42 109.05 117.18 109.05C115.42 109.05 113.73 109.35 112.14 109.96C110.47 106.72 107.7 104.36 104.1 103.13C102.1 102.44 100.12 102.09 98.2 102.09C94.85 102.09 91.76 103.08 89.01 105.03C86.37 101.75 82.39 99.81 78.2 99.81C74.53 99.81 71 101.28 68.39 103.87C64.96 101.25 51.36 92.61 14.95 84.34C13.21 83.95 9.26 82.82 6.78 82.09C10.19 65.75 20.58 50.82 35.98 38.57L36.03 38.55ZM103.57 133.33L103.18 132.98H102.78C102.46 132.98 102.12 133.11 101.67 133.43C99.81 134.74 98.04 135.37 96.23 135.37C95.23 135.37 94.21 135.17 93.19 134.78C84.75 131.49 85.41 123.53 85.83 121.13C85.89 120.64 85.77 120.27 85.46 120.01L84.86 119.52L84.3 120.05C82.65 121.64 80.5 122.5 78.24 122.5C73.41 122.5 69.47 118.57 69.48 113.73C69.48 108.9 73.42 104.97 78.26 104.98C82.63 104.98 86.35 108.26 86.9 112.63L87.2 114.98L88.49 112.99C88.63 112.76 92.18 107.4 98.69 107.41C99.93 107.41 101.21 107.61 102.5 108.01C107.69 109.59 108.57 114.3 108.7 116.26C108.79 117.4 109.61 117.46 109.76 117.46C110.21 117.46 110.54 117.18 110.77 116.93C111.75 115.91 113.88 114.21 117.22 114.21C118.75 114.21 120.37 114.58 122.05 115.3C130.3 118.84 126.56 129.32 126.52 129.43C125.81 131.17 125.78 131.93 126.45 132.38L126.77 132.53H127.01C127.38 132.53 127.84 132.37 128.61 132.11C129.73 131.72 131.42 131.14 133.01 131.14C139.22 131.21 144.27 136.27 144.27 142.4C144.27 148.6 139.21 153.64 133 153.64C126.93 153.64 121.99 148.91 121.77 142.9C121.75 142.38 121.7 141.02 120.54 141.02C120.07 141.02 119.65 141.31 119.18 141.74C117.84 142.98 116.14 144.23 113.66 144.23C112.53 144.23 111.31 143.97 110.02 143.44C103.61 140.84 103.52 136.44 103.78 134.67C103.85 134.2 103.87 133.71 103.55 133.32L103.57 133.33ZM143.64 182.21C67.38 182.21 5.56 142.66 5.56 93.88C5.56 91.92 5.7 89.97 5.89 88.04C6.5 88.19 12.56 89.63 13.81 89.92C51 98.18 63.29 106.77 65.37 108.4C64.67 110.09 64.3 111.91 64.3 113.75C64.3 121.44 70.55 127.7 78.23 127.7C79.09 127.7 79.95 127.62 80.79 127.46C81.95 133.12 85.65 137.41 91.3 139.61C92.95 140.24 94.62 140.57 96.27 140.57C97.33 140.57 98.4 140.44 99.44 140.18C100.49 142.83 102.83 146.14 108.09 148.27C109.93 149.01 111.77 149.4 113.56 149.4C115.02 149.4 116.45 149.14 117.81 148.64C120.33 154.77 126.32 158.84 133 158.84C137.43 158.84 141.68 157.04 144.78 153.85C147.43 155.33 153.03 158 158.69 158.01C159.42 158.01 160.1 157.96 160.8 157.88C166.42 157.17 169.03 154.97 170.23 153.26C170.45 152.96 170.64 152.64 170.81 152.31C172.13 152.69 173.59 153 175.27 153.01C178.34 153.01 181.28 151.96 184.26 149.8C187.19 147.69 189.27 144.66 189.57 142.08C189.57 142.05 189.57 142.01 189.58 141.97C190.57 142.17 191.58 142.27 192.59 142.27C195.75 142.27 198.86 141.29 201.83 139.34C207.56 135.59 208.55 130.68 208.46 127.47C209.47 127.68 210.49 127.79 211.51 127.79C214.47 127.79 217.39 126.9 220.16 125.13C223.71 122.86 225.85 119.38 226.18 115.34C226.39 112.59 225.71 109.81 224.27 107.43C233.85 103.3 255.75 95.31 281.54 89.5C281.65 90.96 281.71 92.43 281.71 93.91C281.71 142.69 219.89 182.24 143.64 182.24V182.21Z" fill="#0A0080"/>
    </svg>
  )
}

// Ícono neutro para proveedores aún sin integración: evita usar logos de
// marcas de terceros sin autorización mientras solo comunicamos un roadmap.
function PlaceholderIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
      {children}
    </div>
  )
}

// Registro de proveedores de pago. Para sumar uno nuevo con integración real
// basta con agregar la entrada aquí y ramificar su panel de detalle abajo.
const PROVIDERS: PaymentProvider[] = [
  {
    id: 'mercado-pago',
    name: 'Mercado Pago',
    description: 'Terminales Smart y pagos con tarjeta',
    icon: () => <MercadoPagoIcon />,
  },
  {
    id: 'clip',
    name: 'Clip',
    description: 'Cobro con tarjeta vía lector físico',
    icon: () => <PlaceholderIcon><Landmark className="size-4" /></PlaceholderIcon>,
    comingSoon: true,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Pagos en línea y suscripciones',
    icon: () => <PlaceholderIcon><Building2 className="size-4" /></PlaceholderIcon>,
    comingSoon: true,
  },
]

const STATUS_LABELS: Record<ProviderStatus, string> = {
  connected: 'Conectado',
  'not-connected': 'Sin conectar',
  locked: 'Requiere upgrade',
  'coming-soon': 'Próximamente',
}

const STATUS_STYLES: Record<ProviderStatus, string> = {
  connected: 'bg-emerald-100 text-emerald-700',
  'not-connected': 'bg-slate-100 text-slate-500',
  locked: 'bg-amber-50 text-amber-700',
  'coming-soon': 'bg-amber-50 text-amber-700',
}

function StatusBadge({ status }: { status: ProviderStatus }) {
  return (
    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export default function PaymentSuppliers() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState(PROVIDERS[0].id)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const canUseCardPayments = useHasFeature('card_payments')

  const { data: connection, isLoading } = useQuery({
    queryKey: ['mercadopago-connection'],
    queryFn: mercadoPagoApi.getConnection,
    enabled: canUseCardPayments,
  })

  // El backend redirige aquí tras el consentimiento OAuth con ?mercadopago=connected|error
  useEffect(() => {
    const result = searchParams.get('mercadopago')
    if (!result) return
    if (result === 'connected') {
      toast.success('Cuenta de Mercado Pago conectada correctamente')
      qc.invalidateQueries({ queryKey: ['mercadopago-connection'] })
    } else if (result === 'error') {
      toast.error('No se pudo completar la conexión con Mercado Pago')
    }
    const next = new URLSearchParams(searchParams)
    next.delete('mercadopago')
    setSearchParams(next, { replace: true })
    // Solo debe correr al montar (llegada desde el callback de MP), no en cada cambio de searchParams.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connectMutation = useMutation({
    mutationFn: mercadoPagoApi.connect,
    onSuccess: ({ authorization_url }) => { window.location.href = authorization_url },
    onError: () => toast.error('No se pudo iniciar la conexión con Mercado Pago'),
  })

  const disconnectMutation = useMutation({
    mutationFn: mercadoPagoApi.disconnect,
    onSuccess: () => {
      toast.success('Cuenta de Mercado Pago desconectada')
      qc.invalidateQueries({ queryKey: ['mercadopago-connection'] })
      setConfirmDisconnect(false)
    },
    onError: () => toast.error('No se pudo desconectar la cuenta'),
  })

  function statusFor(provider: PaymentProvider): ProviderStatus {
    if (provider.comingSoon) return 'coming-soon'
    if (provider.id === 'mercado-pago') {
      if (!canUseCardPayments) return 'locked'
      return connection?.is_active ? 'connected' : 'not-connected'
    }
    return 'not-connected'
  }

  const selected = PROVIDERS.find((p) => p.id === selectedId) ?? PROVIDERS[0]

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Proveedores */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Proveedores de pago</h1>
          <p className="text-sm text-slate-500">Administra las conexiones disponibles para este negocio.</p>
        </div>
        <div className="mt-5 space-y-3">
          {PROVIDERS.map((provider) => {
            const status = statusFor(provider)
            const isSelected = provider.id === selectedId
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => setSelectedId(provider.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-4 text-left transition',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100'
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40',
                )}
              >
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                  {provider.icon()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{provider.name}</p>
                  <p className="truncate text-xs text-slate-500">{provider.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={status} />
                  <ChevronRight className="size-4 text-slate-400" />
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Detalle del proveedor seleccionado */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {selected.comingSoon ? (
          <ComingSoonDetail provider={selected} />
        ) : (
          <MercadoPagoDetail
            connection={connection ?? null}
            isLoading={isLoading}
            canUseCardPayments={canUseCardPayments}
            isConnecting={connectMutation.isPending}
            onConnect={() => connectMutation.mutate()}
            onRequestDisconnect={() => setConfirmDisconnect(true)}
          />
        )}
      </section>

      {/* Confirmación de desconexión */}
      <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <DialogContent className="w-full max-w-md space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle>¿Desconectar Mercado Pago?</DialogTitle>
            <DialogDescription className="text-sm font-normal leading-relaxed text-gray-500">
              Se desactivarán las credenciales y las terminales Smart vinculadas a este negocio.
              Cancela cualquier cobro pendiente antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex w-full gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 outline-none transition-all hover:bg-gray-50 active:bg-gray-100"
              onClick={() => setConfirmDisconnect(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={disconnectMutation.isPending}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-red-600/10 outline-none transition-all hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20 active:scale-[0.98] disabled:opacity-60"
              onClick={() => disconnectMutation.mutate()}
            >
              {disconnectMutation.isPending ? 'Desconectando…' : 'Sí, desconectar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Panel: Mercado Pago ────────────────────────────────────────────────────

const BENEFITS = [
  'Cobra con tarjeta de crédito y débito desde tus Terminales Smart.',
  'El dinero se liquida directo en tu cuenta de Mercado Pago.',
  'El estado del cobro se sincroniza solo con tus ventas.',
]

interface MercadoPagoDetailProps {
  connection: MercadoPagoConnection | null
  isLoading: boolean
  canUseCardPayments: boolean
  isConnecting: boolean
  onConnect: () => void
  onRequestDisconnect: () => void
}

function MercadoPagoDetail({
  connection, isLoading, canUseCardPayments, isConnecting, onConnect, onRequestDisconnect,
}: MercadoPagoDetailProps) {
  const isConnected = !!connection?.is_active
  const status: ProviderStatus = !canUseCardPayments ? 'locked' : isConnected ? 'connected' : 'not-connected'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            <MercadoPagoIcon />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Mercado Pago</h2>
            <p className="text-sm text-slate-500">Terminales Smart y pagos con tarjeta</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {!canUseCardPayments ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Tu plan actual no incluye <strong>pagos con tarjeta</strong>. Actualiza tu suscripción desde la pestaña
          Suscripción para poder conectar Mercado Pago.
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-10 w-48 rounded-md" />
        </div>
      ) : isConnected && connection ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem icon={ShieldCheck} label="Cuenta vinculada" value={connection.collector_id} />
            <InfoItem icon={Clock} label="Token vence" value={formatDateTime(connection.token_expires_at)} />
            <InfoItem
              icon={CheckCircle2}
              label="Última actualización"
              value={formatDateTime(connection.updated_at)}
              className="sm:col-span-2"
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="outline"
              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={onRequestDisconnect}
            >
              <Unlink className="size-4" /> Desconectar cuenta
            </Button>
          </div>
        </>
      ) : (
        <>
          <ul className="space-y-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                {benefit}
              </li>
            ))}
          </ul>
          <Button onClick={onConnect} disabled={isConnecting} className="gap-2 bg-indigo-600 text-white hover:bg-indigo-500">
            {isConnecting && <Loader2 className="size-4 animate-spin" />}
            Conectar con Mercado Pago
          </Button>
          <p className="text-xs text-slate-400">
            Serás redirigido a Mercado Pago para autorizar el acceso a tu cuenta. No compartimos tu contraseña.
          </p>
        </>
      )}
    </div>
  )
}

function InfoItem({
  icon: Icon, label, value, className,
}: { icon: ComponentType<{ className?: string }>; label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3', className)}>
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  )
}

// ─── Panel: proveedor sin integración todavía ───────────────────────────────

function ComingSoonDetail({ provider }: { provider: PaymentProvider }) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="scale-150">{provider.icon()}</div>
      <h2 className="mt-2 text-lg font-bold text-slate-900">{provider.name}</h2>
      <p className="max-w-sm text-sm text-slate-500">
        Estamos trabajando para sumar {provider.name} como proveedor de pago. Te avisaremos en cuanto esté
        disponible para conectar.
      </p>
      <StatusBadge status="coming-soon" />
    </div>
  )
}
