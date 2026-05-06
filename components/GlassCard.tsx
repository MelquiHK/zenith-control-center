import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  glow?: 'cyan' | 'purple' | 'gold' | 'green' | 'red' | 'none'
  hover?: boolean
}

const glowMap = {
  cyan:   'hover:shadow-[0_0_30px_rgba(0,245,255,0.12)]  hover:border-cyan-400/20',
  purple: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.12)] hover:border-purple-400/20',
  gold:   'hover:shadow-[0_0_30px_rgba(245,158,11,0.12)] hover:border-yellow-400/20',
  green:  'hover:shadow-[0_0_30px_rgba(52,211,153,0.12)] hover:border-emerald-400/20',
  red:    'hover:shadow-[0_0_30px_rgba(251,113,133,0.12)] hover:border-red-400/20',
  none:   '',
}

export default function GlassCard({ children, className, glow = 'none', hover = false }: GlassCardProps) {
  return (
    <div className={cn(
      'glass',
      hover && 'transition-all duration-300 cursor-pointer',
      glow !== 'none' && glowMap[glow],
      className
    )}>
      {children}
    </div>
  )
}
