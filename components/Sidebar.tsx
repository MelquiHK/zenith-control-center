'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Wallet, Package, Wrench, Target,
  Zap, Menu, X, ChevronRight
} from 'lucide-react'

const nav = [
  { href: '/',           label: 'Dashboard',   icon: LayoutDashboard, color: 'text-cyan-400',   glow: 'shadow-cyan-400/30' },
  { href: '/finanzas',   label: 'Finanzas',    icon: Wallet,          color: 'text-emerald-400', glow: 'shadow-emerald-400/30' },
  { href: '/inventario', label: 'Inventario',  icon: Package,         color: 'text-blue-400',    glow: 'shadow-blue-400/30' },
  { href: '/servicios',  label: 'Servicios',   icon: Wrench,          color: 'text-orange-400',  glow: 'shadow-orange-400/30' },
  { href: '/metas',      label: 'Metas',       icon: Target,          color: 'text-purple-400',  glow: 'shadow-purple-400/30' },
]

export default function Sidebar() {
  const pathname  = usePathname()
  const [open, setOpen] = useState(false)

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="px-6 py-6 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">ZENITH</p>
            <p className="text-[10px] text-white/40 tracking-widest uppercase">Control Center</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="px-3 space-y-1 flex-1">
        {nav.map(({ href, label, icon: Icon, color, glow }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
                active
                  ? 'bg-white/[0.10] border border-white/[0.12]'
                  : 'hover:bg-white/[0.06] border border-transparent'
              )}
            >
              {active && (
                <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full', color.replace('text-','bg-'))} />
              )}
              <Icon
                size={18}
                className={cn(
                  'transition-all duration-200',
                  active ? color : 'text-white/40 group-hover:text-white/70',
                  active && `drop-shadow-lg`
                )}
              />
              <span className={cn(
                'text-sm font-medium transition-colors duration-200',
                active ? 'text-white' : 'text-white/50 group-hover:text-white/80'
              )}>
                {label}
              </span>
              {active && <ChevronRight size={14} className={cn('ml-auto', color)} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 mt-4 border-t border-white/[0.06]">
        <p className="text-[10px] text-white/20 text-center">⚡ Zenith v1.0 — Cuba</p>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 glass flex items-center justify-center rounded-xl text-white/70"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed left-0 top-0 h-screen w-64 z-40 flex flex-col',
        'bg-[#070714]/90 backdrop-blur-2xl border-r border-white/[0.06]',
        'transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <NavContent />
      </aside>
    </>
  )
}
