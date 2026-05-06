'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toCUP, fmtCUP, fmtDate, todayISO } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import GlassCard from '@/components/GlassCard'
import { Transaction, Product, ServiceOrder, Goal, BodyStat } from '@/types'
import {
  Wallet, Package, Wrench, Target, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Clock, Zap, Scale, Dumbbell
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { format, subDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const CHART_COLORS = ['#00f5ff', '#a855f7', '#10b981', '#f59e0b', '#fb7185']

export default function Dashboard() {
  const [txs,      setTxs]      = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders,   setOrders]   = useState<ServiceOrder[]>([])
  const [goals,    setGoals]    = useState<Goal[]>([])
  const [stats,    setStats]    = useState<BodyStat[]>([])
  const [rate,     setRate]     = useState(540)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      const [txRes, prodRes, ordRes, goalRes, statRes, setRes] = await Promise.all([
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('service_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('goals').select('*'),
        supabase.from('body_stats').select('*').order('date', { ascending: false }).limit(10),
        supabase.from('settings').select('*').single(),
      ])
      if (txRes.data)   setTxs(txRes.data)
      if (prodRes.data) setProducts(prodRes.data)
      if (ordRes.data)  setOrders(ordRes.data)
      if (goalRes.data) setGoals(goalRes.data)
      if (statRes.data) setStats(statRes.data)
      if (setRes.data)  setRate(setRes.data.exchange_rate)
      setLoading(false)
    }
    load()
  }, [])

  // Finance calculations
  const today = todayISO()
  const todayTxs = txs.filter(t => t.created_at.startsWith(today))
  const todayIncome  = todayTxs.filter(t => t.type === 'income').reduce((s, t) => s + toCUP(t.amount, t.currency, rate), 0)
  const todayExpense = todayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + toCUP(t.amount, t.currency, rate), 0)
  const totalIncome  = txs.filter(t => t.type === 'income').reduce((s, t) => s + toCUP(t.amount, t.currency, rate), 0)
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + toCUP(t.amount, t.currency, rate), 0)
  const netTotal     = totalIncome - totalExpense
  const netToday     = todayIncome - todayExpense

  // Inventory
  const lowStock   = products.filter(p => p.stock < 3)
  const totalStock = products.reduce((s, p) => s + p.stock * p.price_cup, 0)

  // Services
  const pending   = orders.filter(o => o.status === 'Pendiente').length
  const inProcess = orders.filter(o => o.status === 'En Proceso').length
  const paidToday = orders.filter(o => o.status === 'Cobrado' && o.updated_at?.startsWith(today)).length

  // Chart data — last 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const dayStr = format(d, 'yyyy-MM-dd')
    const label  = format(d, 'dd/MM', { locale: es })
    const inc = txs.filter(t => t.created_at.startsWith(dayStr) && t.type === 'income')
                   .reduce((s, t) => s + toCUP(t.amount, t.currency, rate), 0)
    const exp = txs.filter(t => t.created_at.startsWith(dayStr) && t.type === 'expense')
                   .reduce((s, t) => s + toCUP(t.amount, t.currency, rate), 0)
    return { label, ingresos: inc, gastos: exp, neto: inc - exp }
  })

  // Pie — categories
  const catMap: Record<string, number> = {}
  txs.filter(t => t.type === 'income').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + toCUP(t.amount, t.currency, rate)
  })
  const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value })).slice(0, 5)

  const lastStat = stats[0]

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <p className="text-white/40 text-sm">Cargando Zenith...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="text-cyan-400" size={24} />
            Dashboard
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            {format(new Date(), "EEEE dd 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <div className="glass px-4 py-2 text-sm">
          <span className="text-white/40">Tasa: </span>
          <span className="text-yellow-400 font-mono font-medium">1 USD = {rate} CUP</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ganancia neta total"
          value={fmtCUP(netTotal)}
          subtitle={`${(netTotal / rate).toFixed(2)} USD`}
          icon={TrendingUp}
          color="green"
          trend={netTotal >= 0 ? { value: 'positivo', positive: true } : { value: 'negativo', positive: false }}
        />
        <StatCard
          title="Net del día"
          value={fmtCUP(netToday)}
          subtitle={`Ingresos hoy: ${fmtCUP(todayIncome)}`}
          icon={Wallet}
          color="cyan"
        />
        <StatCard
          title="Servicios activos"
          value={String(pending + inProcess)}
          subtitle={`${pending} pendientes · ${inProcess} en proceso`}
          icon={Wrench}
          color="purple"
        />
        <StatCard
          title="Stock crítico"
          value={String(lowStock.length)}
          subtitle={`${products.length} productos · ${fmtCUP(totalStock)} en inventario`}
          icon={Package}
          color={lowStock.length > 0 ? 'red' : 'gold'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area Chart */}
        <GlassCard className="p-5 lg:col-span-2">
          <p className="text-sm font-semibold text-white/70 mb-4">Finanzas — últimos 7 días</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#fb7185" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={60}
                     tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip
                contentStyle={{ background: 'rgba(10,10,31,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
              />
              <Area type="monotone" dataKey="ingresos" stroke="#10b981" fill="url(#gradInc)" strokeWidth={2} name="Ingresos" />
              <Area type="monotone" dataKey="gastos"   stroke="#fb7185" fill="url(#gradExp)" strokeWidth={2} name="Gastos" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Pie Chart */}
        <GlassCard className="p-5">
          <p className="text-sm font-semibold text-white/70 mb-4">Ingresos por categoría</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                       paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'rgba(10,10,31,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '11px' }}
                    formatter={(v: number) => [fmtCUP(v), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i] }} />
                    <span className="text-white/50 truncate flex-1">{d.name}</span>
                    <span className="text-white/80 font-mono">{fmtCUP(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-white/20 text-sm">Sin datos aún</div>
          )}
        </GlassCard>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Low Stock Alert */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-yellow-400" />
            <p className="text-sm font-semibold text-white/70">Stock crítico</p>
          </div>
          {lowStock.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 size={16} />
              <span>Todo el stock está bien</span>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                  <div>
                    <p className="text-sm text-white/80 font-medium">{p.name}</p>
                    <p className="text-xs text-white/30">{p.category}</p>
                  </div>
                  <span className="badge text-red-400 bg-red-400/10 border-red-400/30">
                    {p.stock} ud{p.stock !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Active Services */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={16} className="text-purple-400" />
            <p className="text-sm font-semibold text-white/70">Servicios recientes</p>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 4).map(o => (
              <div key={o.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-sm text-white/80 truncate">{o.client}</p>
                  <p className="text-xs text-white/30 truncate">{o.service_type}</p>
                </div>
                <span className={`badge text-xs flex-shrink-0 ${
                  o.status === 'Pendiente' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' :
                  o.status === 'En Proceso' ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30' :
                  'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
                }`}>
                  {o.status === 'Pendiente' ? <Clock size={10} /> : o.status === 'En Proceso' ? <Zap size={10} /> : <CheckCircle2 size={10} />}
                  {o.status}
                </span>
              </div>
            ))}
            {orders.length === 0 && <p className="text-white/20 text-sm">Sin órdenes</p>}
          </div>
        </GlassCard>

        {/* Goals & Body */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-cyan-400" />
            <p className="text-sm font-semibold text-white/70">Metas & Fitness</p>
          </div>

          {/* Goals progress */}
          <div className="space-y-3 mb-4">
            {goals.map(g => {
              const pct = g.target_amount > 0 ? Math.min(100, (g.allocated / g.target_amount) * 100) : 0
              const color = pct >= 100 ? '#10b981' : pct >= 50 ? '#00f5ff' : pct >= 25 ? '#f59e0b' : '#fb7185'
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">{g.emoji} {g.name}</span>
                    <span className="text-white/40 font-mono">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Body stats */}
          {lastStat && (
            <div className="border-t border-white/[0.06] pt-3 grid grid-cols-3 gap-2">
              {[
                { icon: Scale,    label: 'Peso',   value: `${lastStat.weight}kg`, color: 'text-cyan-400' },
                { icon: Dumbbell, label: 'Banca',  value: `${lastStat.bench_press}kg`, color: 'text-purple-400' },
                { icon: Dumbbell, label: 'Bíceps', value: `${lastStat.bicep_curl}kg`, color: 'text-yellow-400' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="text-center">
                  <Icon size={14} className={`${color} mx-auto mb-1`} />
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-white/30">{label}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
