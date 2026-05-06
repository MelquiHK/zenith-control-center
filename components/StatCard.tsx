import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  color?: 'cyan' | 'purple' | 'gold' | 'green' | 'red'
}

const colorMap = {
  cyan:   { icon: 'text-cyan-400',    bg: 'bg-cyan-400/10',    border: 'border-cyan-400/20' },
  purple: { icon: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/20' },
  gold:   { icon: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20' },
  green:  { icon: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  red:    { icon: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20' },
}

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'cyan' }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className={cn('glass p-5 transition-all duration-300 hover:bg-white/[0.06]', c.border)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">{title}</p>
          <p className={cn('text-2xl font-bold truncate', c.icon)}>{value}</p>
          {subtitle && <p className="text-xs text-white/40 mt-1 truncate">{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs mt-2 font-medium', trend.positive ? 'text-emerald-400' : 'text-red-400')}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3', c.bg)}>
          <Icon size={18} className={c.icon} />
        </div>
      </div>
    </div>
  )
}
