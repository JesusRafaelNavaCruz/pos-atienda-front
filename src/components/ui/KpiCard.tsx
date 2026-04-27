import React from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from './card'
import { Skeleton } from './badge'
import { cn, formatGrowth } from '@/lib/utils'

type KpiColor = 'indigo' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'

const colorMap: Record<KpiColor, {
  card:     string
  iconBg:   string
  iconText: string
  title:    string
  value:    string
  subtitle: string
}> = {
  indigo: { card: 'backdrop-blur-xl bg-indigo-700/70 border-indigo-500/30 text-white shadow-2xl', iconBg: 'bg-white/20', iconText: 'text-white', title: 'text-white/80', value: 'text-white', subtitle: 'text-white/70' },
  blue:   { card: 'backdrop-blur-xl bg-blue-700/70   border-blue-500/30   text-white shadow-2xl', iconBg: 'bg-white/20', iconText: 'text-white', title: 'text-white/80', value: 'text-white', subtitle: 'text-white/70' },
  green:  { card: 'backdrop-blur-xl bg-green-700/70  border-green-500/30  text-white shadow-2xl', iconBg: 'bg-white/20', iconText: 'text-white', title: 'text-white/80', value: 'text-white', subtitle: 'text-white/70' },
  yellow: { card: 'backdrop-blur-xl bg-yellow-600/70 border-yellow-400/30 text-white shadow-2xl', iconBg: 'bg-white/20', iconText: 'text-white', title: 'text-white/80', value: 'text-white', subtitle: 'text-white/70' },
  red:    { card: 'backdrop-blur-xl bg-red-700/70    border-red-500/30    text-white shadow-2xl', iconBg: 'bg-white/20', iconText: 'text-white', title: 'text-white/80', value: 'text-white', subtitle: 'text-white/70' },
  purple: { card: 'backdrop-blur-xl bg-purple-700/70 border-purple-500/30 text-white shadow-2xl', iconBg: 'bg-white/20', iconText: 'text-white', title: 'text-white/80', value: 'text-white', subtitle: 'text-white/70' },
}

export interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
  color?: KpiColor
  trend?: number | null
  trendLabel?: string
  loading?: boolean
  className?: string
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
  trend,
  trendLabel = 'vs ayer',
  loading,
  className,
}: KpiCardProps) {
  const c = colorMap[color]

  return (
    <Card className={cn(c.card, className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className={cn('text-sm', c.title)}>{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-32 bg-white/20" />
            ) : (
              <p className={cn('text-2xl font-bold', c.value)}>{value}</p>
            )}
            {subtitle && <p className={cn('text-xs', c.subtitle)}>{subtitle}</p>}
          </div>
          <div className={cn('size-10 rounded-lg flex items-center justify-center', c.iconBg)}>
            <Icon className={cn('size-5', c.iconText)} />
          </div>
        </div>
        {trend !== undefined && trend !== null && (
          <div className={cn(
            'flex items-center gap-1 mt-3 text-xs font-medium',
            trend >= 0 ? 'text-emerald-300' : 'text-red-300',
          )}>
            {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {formatGrowth(trend)} {trendLabel}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
