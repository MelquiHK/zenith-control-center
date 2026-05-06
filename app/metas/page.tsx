'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toCUP, fmtCUP } from '@/lib/utils'
import { Goal, BodyStat } from '@/types'
import GlassCard from '@/components/GlassCard'
import toast from 'react-hot-toast'
import {
  Target, Plus, X, Scale, Dumbbell, TrendingUp,
  Edit2, PlusCircle, ChevronUp, ChevronDown, Trophy
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

const GOAL_COLORS = ['cyan', 'purple', 'gold', 'green', 'red']
const GOAL_EMOJIS = ['🎯','🥤','🏍️','🏖️','💪','🚀','💰','🏠','✈️','📱','🎮','🏋️']

const colorGradients: Record<string, string> = {
  cyan:   'from-cyan-500 to-blue-600',
  purple: 'from-purple-500 to-pink-600',
  gold:   'from-yellow-400 to-orange-500',
  green:  'from-emerald-400 to-teal-600',
  red:    'from-red-400 to-rose-600',
}
const colorText: Record<string, string> = {
  cyan: 'text-cyan-400', purple: 'text-purple-400', gold: 'text-yellow-400',
  green: 'text-emerald-400', red: 'text-red-400',
}
const colorBg: Record<string, string> = {
  cyan: 'bg-cyan-400', purple: 'bg-purple-400', gold: 'bg-yellow-400',
  green: 'bg-emerald-400', red: 'bg-red-400',
}

export default function MetasPage() {
  const [goals,   setGoals]   = useState<Goal[]>([])
  const [stats,   setStats]   = useState<BodyStat[]>([])
  const [rate,    setRate]    = useState(540)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState<'goals' | 'fitness'>('goals')

  // Modals
  const [goalModal, setGoalModal] = useState<Goal | null | 'new'>(null)
  const [allocModal, setAllocModal] = useState<Goal | null>(null)
  const [statModal,  setStatModal]  = useState(false)

  // Forms
  const [goalForm, setGoalForm] = useState({ name: '', emoji: '🎯', target_amount: '', currency: 'CUP', color: 'cyan' })
  const [allocForm, setAllocForm] = useState({ amount: '', mode: 'add' as 'add' | 'set' })
  const [statForm, setStatForm] = useState({ date: new Date().toISOString().split('T')[0], weight: '', bench_press: '', bicep_curl: '', notes: '' })

  const load = async () => {
    const [gRes, sRes, setRes] = await Promise.all([
      supabase.from('goals').select('*').order('created_at'),
      supabase.from('body_stats').select('*').order('date', { ascending: true }),
      supabase.from('settings').select('*').single(),
    ])
    if (gRes.data) setGoals(gRes.data)
    if (sRes.data) setStats(sRes.data)
    if (setRes.data) setRate(setRes.data.exchange_rate)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSaveGoal = async () => {
    if (!goalForm.name || !goalForm.target_amount) { toast.error('Completa nombre y monto objetivo'); return }
    const payload = {
      name: goalForm.name, emoji: goalForm.emoji,
      target_amount: parseFloat(goalForm.target_amount),
      currency: goalForm.currency, color: goalForm.color
    }
    if (goalModal === 'new') {
      const { error } = await supabase.from('goals').insert(payload)
      if (error) { toast.error('Error'); return }
      toast.success('Meta creada ✅')
    } else if (goalModal && typeof goalModal === 'object') {
      const { error } = await supabase.from('goals').update(payload).eq('id', goalModal.id)
      if (error) { toast.error('Error'); return }
      toast.success('Meta actualizada ✅')
    }
    setGoalModal(null); load()
  }

  const handleAllocate = async () => {
    if (!allocModal || !allocForm.amount) { toast.error('Ingresa un monto'); return }
    const amount = parseFloat(allocForm.amount)
    const newAllocated = allocForm.mode === 'add'
      ? allocModal.allocated + amount
      : amount
    const { error } = await supabase.from('goals').update({ allocated: newAllocated }).eq('id', allocModal.id)
    if (error) { toast.error('Error'); return }
    const pct = Math.min(100, newAllocated / allocModal.target_amount * 100)
    toast.success(`${allocModal.emoji} ${pct.toFixed(1)}% alcanzado`)
    if (pct >= 100) toast('🏆 ¡META ALCANZADA!', { icon: '🏆' })
    setAllocModal(null); load()
  }

  const handleSaveStat = async () => {
    if (!statForm.weight) { toast.error('El peso es requerido'); return }
    const { error } = await supabase.from('body_stats').insert({
      date: statForm.date,
      weight: parseFloat(statForm.weight),
      bench_press: parseFloat(statForm.bench_press || '0'),
      bicep_curl: parseFloat(statForm.bicep_curl || '0'),
      notes: statForm.notes
    })
    if (error) { toast.error('Error'); return }
    toast.success('Stat registrado 💪')
    setStatModal(false)
    setStatForm({ date: new Date().toISOString().split('T')[0], weight: '', bench_press: '', bicep_curl: '', notes: '' })
    load()
  }

  const lastStat = stats.length > 0 ? stats[stats.length - 1] : null
  const firstStat = stats.length > 0 ? stats[0] : null
  const goalWeight = 70

  if (loading) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="text-purple-400" size={22} /> Metas & Fitness
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Road to 70kg & Beyond</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStatModal(true)} className="btn-secondary text-sm px-3 py-2">
            <Dumbbell size={14} /> Stat
          </button>
          <button onClick={() => { setGoalForm({ name:'', emoji:'🎯', target_amount:'', currency:'CUP', color:'cyan' }); setGoalModal('new') }}
            className="btn-primary text-sm px-3 py-2">
            <Plus size={16} /> Meta
          </button>
        </div>
      </div>

      {/* Body summary */}
      {lastStat && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Peso actual',  value: `${lastStat.weight} kg`,       icon: Scale,    color: 'cyan',   target: `Meta: ${goalWeight}kg`, delta: lastStat.weight - (firstStat?.weight || lastStat.weight) },
            { label: 'Press banca',  value: `${lastStat.bench_press} kg`,  icon: Dumbbell, color: 'purple', target: 'Marca personal', delta: lastStat.bench_press - (firstStat?.bench_press || lastStat.bench_press) },
            { label: 'Curl bíceps', value: `${lastStat.bicep_curl} kg`,   icon: Dumbbell, color: 'gold',   target: 'Marca personal', delta: lastStat.bicep_curl - (firstStat?.bicep_curl || lastStat.bicep_curl) },
          ].map(({ label, value, icon: Icon, color, target, delta }) => (
            <GlassCard key={label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${colorText[color]}`}>{value}</p>
                  <p className="text-xs text-white/30 mt-1">{target}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-400/10`}>
                  <Icon size={18} className={colorText[color]} />
                </div>
              </div>
              {delta !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {delta > 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg desde el inicio
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* Road to 70kg progress */}
      {lastStat && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white/70">🏋️ Road to 70kg</p>
              <p className="text-xs text-white/30">Peso corporal objetivo</p>
            </div>
            <span className={`text-2xl font-bold ${lastStat.weight >= goalWeight ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {lastStat.weight >= goalWeight ? '🏆 ¡LOGRADO!' : `${((lastStat.weight / goalWeight) * 100).toFixed(1)}%`}
            </span>
          </div>
          <div className="progress-track h-3 mb-2">
            <div className="progress-fill bg-gradient-to-r from-cyan-500 to-emerald-400"
                 style={{ width: `${Math.min(100, (lastStat.weight / goalWeight) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-white/30">
            <span>{firstStat?.weight || lastStat.weight} kg (inicio)</span>
            <span className="text-white/60">{lastStat.weight} kg (ahora)</span>
            <span>{goalWeight} kg (meta)</span>
          </div>
        </GlassCard>
      )}

      {/* Tabs */}
      <div className="flex gap-1 glass p-1 w-fit rounded-xl">
        <button onClick={() => setTab('goals')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'goals' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
          🎯 Metas de ahorro
        </button>
        <button onClick={() => setTab('fitness')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'fitness' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
          💪 Progresión física
        </button>
      </div>

      {/* Goals */}
      {tab === 'goals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(g => {
            const pct = g.target_amount > 0 ? Math.min(100, (g.allocated / g.target_amount) * 100) : 0
            const color = g.color || 'cyan'
            const remaining = Math.max(0, g.target_amount - g.allocated)
            return (
              <GlassCard key={g.id} className="p-5 relative overflow-hidden">
                {pct >= 100 && (
                  <div className="absolute top-3 right-3">
                    <Trophy size={16} className="text-yellow-400" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorGradients[color]} flex items-center justify-center text-2xl shadow-lg`}>
                    {g.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{g.name}</p>
                    <p className="text-xs text-white/30">{g.currency} • {g.target_amount.toLocaleString()}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/50">{g.allocated.toLocaleString()} / {g.target_amount.toLocaleString()}</span>
                    <span className={`font-bold ${colorText[color]}`}>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="progress-track h-2.5">
                    <div className={`progress-fill bg-gradient-to-r ${colorGradients[color]}`}
                         style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/30">
                    {remaining > 0 ? `Faltan: ${remaining.toLocaleString()} ${g.currency}` : '✅ Meta alcanzada'}
                  </p>
                  <div className="flex gap-1">
                    <button onClick={() => { setGoalForm({ name: g.name, emoji: g.emoji, target_amount: String(g.target_amount), currency: g.currency, color: g.color }); setGoalModal(g) }}
                      className="p-1.5 text-white/30 hover:text-white/70 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => { setAllocModal(g); setAllocForm({ amount: '', mode: 'add' }) }}
                      className={`p-1.5 ${colorText[color]} opacity-60 hover:opacity-100 transition-opacity`}>
                      <PlusCircle size={13} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            )
          })}
          {goals.length === 0 && (
            <div className="col-span-3 text-center text-white/20 py-12">
              <Target size={32} className="mx-auto mb-3 opacity-30" />
              <p>No hay metas. ¡Crea la primera!</p>
            </div>
          )}
        </div>
      )}

      {/* Fitness progress */}
      {tab === 'fitness' && (
        <div className="space-y-4">
          {stats.length >= 2 ? (
            <GlassCard className="p-5">
              <p className="text-sm font-semibold text-white/70 mb-4">Progresión en el tiempo</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(10,10,31,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }}
                           formatter={(v: number) => [`${v} kg`, '']} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }} />
                  <Line type="monotone" dataKey="weight"      name="Peso (kg)"   stroke="#00f5ff" strokeWidth={2} dot={{ fill: '#00f5ff', r: 3 }} />
                  <Line type="monotone" dataKey="bench_press" name="Banca (kg)"  stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} />
                  <Line type="monotone" dataKey="bicep_curl"  name="Bíceps (kg)" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          ) : (
            <GlassCard className="p-8 text-center">
              <Dumbbell size={32} className="mx-auto mb-3 text-white/20" />
              <p className="text-white/40">Registra al menos 2 stats para ver la gráfica de progresión</p>
            </GlassCard>
          )}

          <GlassCard className="p-5">
            <p className="text-sm font-semibold text-white/70 mb-4">Historial de stats</p>
            <div className="overflow-x-auto">
              <table className="w-full table-glass">
                <thead><tr>
                  <th className="text-left">Fecha</th>
                  <th className="text-center text-cyan-400/70">Peso (kg)</th>
                  <th className="text-center text-purple-400/70">Banca (kg)</th>
                  <th className="text-center text-yellow-400/70">Bíceps (kg)</th>
                  <th className="text-left">Notas</th>
                </tr></thead>
                <tbody>
                  {[...stats].reverse().map((s, i, arr) => {
                    const prev = arr[i + 1]
                    const dc = (curr: number, p?: number) => !p ? 'text-white/70' : curr > p ? 'text-emerald-400' : curr < p ? 'text-red-400' : 'text-white/70'
                    return (
                      <tr key={s.id}>
                        <td className="text-white/40 text-xs">{s.date}</td>
                        <td className={`text-center font-mono font-semibold ${dc(s.weight, prev?.weight)}`}>{s.weight}</td>
                        <td className={`text-center font-mono font-semibold ${dc(s.bench_press, prev?.bench_press)}`}>{s.bench_press}</td>
                        <td className={`text-center font-mono font-semibold ${dc(s.bicep_curl, prev?.bicep_curl)}`}>{s.bicep_curl}</td>
                        <td className="text-white/30 text-xs">{s.notes}</td>
                      </tr>
                    )
                  })}
                  {stats.length === 0 && <tr><td colSpan={5} className="text-center text-white/20 py-8">Sin registros</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Goal Modal */}
      {goalModal && (
        <div className="modal-overlay" onClick={() => setGoalModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {goalModal === 'new' ? '🎯 Nueva Meta' : `✏️ Editar Meta`}
              </h2>
              <button onClick={() => setGoalModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_EMOJIS.map(e => (
                    <button key={e} onClick={() => setGoalForm({...goalForm, emoji: e})}
                      className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${goalForm.emoji === e ? 'bg-white/20 scale-110' : 'bg-white/5 hover:bg-white/10'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Nombre *</label>
                <input className="input-glass" placeholder="Ej. Mi moto" value={goalForm.name} onChange={e => setGoalForm({...goalForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Monto objetivo *</label>
                  <input className="input-glass" type="number" placeholder="0" value={goalForm.target_amount} onChange={e => setGoalForm({...goalForm, target_amount: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Moneda</label>
                  <select className="select-glass" value={goalForm.currency} onChange={e => setGoalForm({...goalForm, currency: e.target.value})}>
                    <option value="CUP">CUP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Color</label>
                <div className="flex gap-2">
                  {GOAL_COLORS.map(c => (
                    <button key={c} onClick={() => setGoalForm({...goalForm, color: c})}
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorGradients[c]} transition-all ${goalForm.color === c ? 'scale-110 ring-2 ring-white/30' : 'opacity-60 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setGoalModal(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSaveGoal} className="btn-primary flex-1">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Modal */}
      {allocModal && (
        <div className="modal-overlay" onClick={() => setAllocModal(null)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{allocModal.emoji} {allocModal.name}</h2>
              <button onClick={() => setAllocModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-sm text-white/40 mb-4">
              Asignado: <span className="text-white">{allocModal.allocated.toLocaleString()} {allocModal.currency}</span>
              {' '}/ <span className="text-white">{allocModal.target_amount.toLocaleString()}</span>
            </p>
            <div className="flex gap-1 glass p-1 rounded-xl mb-4">
              {(['add','set'] as const).map(m => (
                <button key={m} onClick={() => setAllocForm({...allocForm, mode: m})}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${allocForm.mode === m ? 'bg-white/10 text-white' : 'text-white/40'}`}>
                  {m === 'add' ? '+ Agregar' : '= Establecer'}
                </button>
              ))}
            </div>
            <input className="input-glass mb-4" type="number" placeholder={`Monto en ${allocModal.currency}`}
              value={allocForm.amount} onChange={e => setAllocForm({...allocForm, amount: e.target.value})} />
            <div className="flex gap-3">
              <button onClick={() => setAllocModal(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleAllocate} className="btn-primary flex-1"><PlusCircle size={16} /> Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Body Stat Modal */}
      {statModal && (
        <div className="modal-overlay" onClick={() => setStatModal(false)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">💪 Registrar Stat Corporal</h2>
              <button onClick={() => setStatModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Fecha</label>
                <input className="input-glass" type="date" value={statForm.date} onChange={e => setStatForm({...statForm, date: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-cyan-400/70 mb-1.5 block">Peso (kg) *</label>
                  <input className="input-glass" type="number" step="0.1" placeholder={lastStat ? String(lastStat.weight) : "65"}
                    value={statForm.weight} onChange={e => setStatForm({...statForm, weight: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-purple-400/70 mb-1.5 block">Banca (kg)</label>
                  <input className="input-glass" type="number" step="0.5" placeholder={lastStat ? String(lastStat.bench_press) : "0"}
                    value={statForm.bench_press} onChange={e => setStatForm({...statForm, bench_press: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-yellow-400/70 mb-1.5 block">Bíceps (kg)</label>
                  <input className="input-glass" type="number" step="0.5" placeholder={lastStat ? String(lastStat.bicep_curl) : "0"}
                    value={statForm.bicep_curl} onChange={e => setStatForm({...statForm, bicep_curl: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Notas del entreno</label>
                <input className="input-glass" placeholder="Ej. PR en sentadilla, buen día..." value={statForm.notes}
                  onChange={e => setStatForm({...statForm, notes: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStatModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSaveStat} className="btn-primary flex-1">
                  <Dumbbell size={16} /> Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
