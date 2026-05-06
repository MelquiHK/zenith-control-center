'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toCUP, fmtCUP, fmtDate, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/utils'
import { Transaction } from '@/types'
import GlassCard from '@/components/GlassCard'
import StatCard from '@/components/StatCard'
import toast from 'react-hot-toast'
import {
  Wallet, Plus, TrendingUp, TrendingDown, Filter,
  X, DollarSign, RefreshCw, ChevronDown
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

type TxType = 'income' | 'expense'

export default function FinanzasPage() {
  const [txs,       setTxs]     = useState<Transaction[]>([])
  const [rate,      setRate]    = useState(540)
  const [filter,    setFilter]  = useState<'all' | 'income' | 'expense'>('all')
  const [loading,   setLoading] = useState(true)
  const [modal,     setModal]   = useState<TxType | null>(null)
  const [rateModal, setRateModal] = useState(false)

  // Form state
  const [form, setForm] = useState({
    category: '', description: '', amount: '', currency: 'CUP' as 'CUP'|'USD'
  })
  const [newRate, setNewRate] = useState('')

  const load = async () => {
    const [txRes, setRes] = await Promise.all([
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('settings').select('*').single(),
    ])
    if (txRes.data) setTxs(txRes.data)
    if (setRes.data) { setRate(setRes.data.exchange_rate); setNewRate(String(setRes.data.exchange_rate)) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalIncome  = txs.filter(t => t.type === 'income').reduce((s, t) => s + toCUP(t.amount, t.currency, rate), 0)
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + toCUP(t.amount, t.currency, rate), 0)
  const net          = totalIncome - totalExpense

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const ds = format(d, 'yyyy-MM-dd')
    const inc = txs.filter(t => t.created_at.startsWith(ds) && t.type === 'income').reduce((s, t) => s + toCUP(t.amount, t.currency, rate), 0)
    const exp = txs.filter(t => t.created_at.startsWith(ds) && t.type === 'expense').reduce((s, t) => s + toCUP(t.amount, t.currency, rate), 0)
    return { label: format(d, 'dd/MM', { locale: es }), Ingresos: inc, Gastos: exp }
  })

  const displayed = txs.filter(t => filter === 'all' ? true : t.type === filter)

  const handleSubmit = async (type: TxType) => {
    if (!form.description || !form.amount || !form.category) {
      toast.error('Completa todos los campos'); return
    }
    const amount = parseFloat(form.amount)
    const cup_equiv = toCUP(amount, form.currency, rate)
    const { error } = await supabase.from('transactions').insert({
      type, category: form.category, description: form.description,
      amount, currency: form.currency, cup_equiv
    })
    if (error) { toast.error('Error al guardar'); return }
    toast.success(`${type === 'income' ? 'Ingreso' : 'Gasto'} registrado ✅`)
    setModal(null)
    setForm({ category: '', description: '', amount: '', currency: 'CUP' })
    load()
  }

  const handleRateUpdate = async () => {
    const r = parseFloat(newRate)
    if (!r || r <= 0) { toast.error('Tasa inválida'); return }
    const { error } = await supabase.from('settings').update({ exchange_rate: r, updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) { toast.error('Error'); return }
    setRate(r); setRateModal(false)
    toast.success(`Tasa actualizada: 1 USD = ${r} CUP`)
    load()
  }

  if (loading) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-emerald-400" size={22} />
            Finanzas
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Gestión dual CUP / USD</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRateModal(true)} className="btn-secondary text-sm px-3 py-2">
            <RefreshCw size={14} />
            <span className="hidden sm:inline">1 USD = {rate} CUP</span>
          </button>
          <button onClick={() => setModal('expense')} className="btn-danger text-sm px-3 py-2">
            <TrendingDown size={14} /> Gasto
          </button>
          <button onClick={() => setModal('income')} className="btn-success text-sm px-3 py-2">
            <TrendingUp size={14} /> Ingreso
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total ingresos" value={fmtCUP(totalIncome)} subtitle={`${(totalIncome/rate).toFixed(2)} USD`} icon={TrendingUp} color="green" />
        <StatCard title="Total gastos"   value={fmtCUP(totalExpense)} subtitle={`${(totalExpense/rate).toFixed(2)} USD`} icon={TrendingDown} color="red" />
        <StatCard title="Ganancia neta"  value={fmtCUP(net)} subtitle={`${(net/rate).toFixed(2)} USD`} icon={DollarSign} color={net >= 0 ? 'cyan' : 'red'} />
      </div>

      {/* Chart */}
      <GlassCard className="p-5">
        <p className="text-sm font-semibold text-white/70 mb-4">Últimos 7 días</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={60}
                   tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip contentStyle={{ background: 'rgba(10,10,31,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }}
                     formatter={(v: number) => [fmtCUP(v), '']} />
            <Legend wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }} />
            <Bar dataKey="Ingresos" fill="#10b981" radius={[4,4,0,0]} maxBarSize={32} />
            <Bar dataKey="Gastos"   fill="#fb7185" radius={[4,4,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Transaction list */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-white/70">Transacciones ({displayed.length})</p>
          <div className="flex gap-1">
            {(['all','income','expense'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
                {f === 'all' ? 'Todo' : f === 'income' ? 'Ingresos' : 'Gastos'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-glass">
            <thead>
              <tr>
                <th className="text-left">Fecha</th>
                <th className="text-left">Tipo</th>
                <th className="text-left">Categoría</th>
                <th className="text-left">Descripción</th>
                <th className="text-right">Monto</th>
                <th className="text-right">CUP equiv.</th>
              </tr>
            </thead>
            <tbody>
              {displayed.slice(0, 50).map(t => (
                <tr key={t.id}>
                  <td className="text-white/40 text-xs">{fmtDate(t.created_at)}</td>
                  <td>
                    <span className={`badge text-xs ${t.type === 'income' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' : 'text-red-400 bg-red-400/10 border-red-400/30'}`}>
                      {t.type === 'income' ? '+' : '−'} {t.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </td>
                  <td className="text-white/50 text-xs">{t.category}</td>
                  <td className="text-white/80">{t.description}</td>
                  <td className={`text-right font-mono text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '−'}{t.amount.toLocaleString()} {t.currency}
                  </td>
                  <td className={`text-right font-mono text-xs ${t.type === 'income' ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                    {fmtCUP(toCUP(t.amount, t.currency, rate))}
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr><td colSpan={6} className="text-center text-white/20 py-8">Sin transacciones</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Transaction Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {modal === 'income' ? '💚 Registrar Ingreso' : '🔴 Registrar Gasto'}
              </h2>
              <button onClick={() => setModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Categoría</label>
                <select className="select-glass" value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}>
                  <option value="">Seleccionar...</option>
                  {(modal === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Descripción</label>
                <input className="input-glass" placeholder="Ej. Cargador vendido a Pedro..."
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Monto</label>
                  <input className="input-glass" type="number" placeholder="0.00"
                    value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Moneda</label>
                  <select className="select-glass" value={form.currency}
                    onChange={e => setForm({...form, currency: e.target.value as 'CUP'|'USD'})}>
                    <option value="CUP">CUP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              {form.amount && form.currency === 'USD' && (
                <p className="text-xs text-yellow-400/70 bg-yellow-400/5 rounded-lg px-3 py-2">
                  ≈ {fmtCUP(parseFloat(form.amount || '0') * rate)} al cambio actual
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={() => handleSubmit(modal)}
                  className={modal === 'income' ? 'btn-success flex-1' : 'btn-danger flex-1'}>
                  <Plus size={16} /> Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rate Modal */}
      {rateModal && (
        <div className="modal-overlay" onClick={() => setRateModal(false)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">🔄 Tasa de cambio</h2>
              <button onClick={() => setRateModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-white/40 text-sm mb-4">Tasa actual: <span className="text-yellow-400">1 USD = {rate} CUP</span></p>
            <input className="input-glass mb-4" type="number" placeholder="Nueva tasa"
              value={newRate} onChange={e => setNewRate(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setRateModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleRateUpdate} className="btn-primary flex-1">Actualizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
