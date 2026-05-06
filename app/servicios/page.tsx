'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toCUP, fmtCUP, fmtDate, SERVICE_TYPES, STATUS_COLORS } from '@/lib/utils'
import { ServiceOrder } from '@/types'
import GlassCard from '@/components/GlassCard'
import StatCard from '@/components/StatCard'
import toast from 'react-hot-toast'
import { Wrench, Plus, X, Clock, Zap, CheckCircle2, ChevronDown, Edit2 } from 'lucide-react'

export default function ServiciosPage() {
  const [orders,  setOrders]  = useState<ServiceOrder[]>([])
  const [rate,    setRate]    = useState(540)
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<ServiceOrder | null | 'new'>(null)
  const [filter,  setFilter]  = useState<string>('all')

  const [form, setForm] = useState({
    client: '', phone: '', address: '', service_type: SERVICE_TYPES[0],
    description: '', status: 'Pendiente' as ServiceOrder['status'],
    price: '', currency: 'CUP' as 'CUP'|'USD', manager: '', commission_pct: '', notes: ''
  })

  const load = async () => {
    const [oRes, sRes] = await Promise.all([
      supabase.from('service_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('settings').select('*').single(),
    ])
    if (oRes.data) setOrders(oRes.data)
    if (sRes.data) setRate(sRes.data.exchange_rate)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const pending   = orders.filter(o => o.status === 'Pendiente').length
  const inProcess = orders.filter(o => o.status === 'En Proceso').length
  const paid      = orders.filter(o => o.status === 'Cobrado').length
  const totalRev  = orders.filter(o => o.status === 'Cobrado').reduce((s, o) => s + toCUP(o.price, o.currency, rate), 0)
  const totalComm = orders.filter(o => o.status === 'Cobrado' && o.manager)
                          .reduce((s, o) => s + toCUP(o.price, o.currency, rate) * (o.commission_pct || 0) / 100, 0)

  const displayed = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const openNew = () => {
    setForm({ client: '', phone: '', address: '', service_type: SERVICE_TYPES[0],
              description: '', status: 'Pendiente', price: '', currency: 'CUP',
              manager: '', commission_pct: '', notes: '' })
    setModal('new')
  }

  const openEdit = (o: ServiceOrder) => {
    setForm({
      client: o.client, phone: o.phone || '', address: o.address || '',
      service_type: o.service_type, description: o.description,
      status: o.status, price: String(o.price), currency: o.currency,
      manager: o.manager || '', commission_pct: String(o.commission_pct || ''), notes: o.notes || ''
    })
    setModal(o)
  }

  const handleSubmit = async () => {
    if (!form.client || !form.description) { toast.error('Completa cliente y descripción'); return }
    const price = parseFloat(form.price || '0')
    const commission_pct = parseFloat(form.commission_pct || '0')

    const payload = {
      client: form.client, phone: form.phone, address: form.address,
      service_type: form.service_type, description: form.description,
      status: form.status, price, currency: form.currency,
      manager: form.manager, commission_pct, notes: form.notes,
      updated_at: new Date().toISOString()
    }

    if (modal === 'new') {
      const { error } = await supabase.from('service_orders').insert(payload)
      if (error) { toast.error('Error'); return }
      toast.success('Orden creada ✅')
    } else if (modal && typeof modal === 'object') {
      const wasNotPaid = modal.status !== 'Cobrado'
      const { error } = await supabase.from('service_orders').update(payload).eq('id', modal.id)
      if (error) { toast.error('Error'); return }

      // Auto-register income when marking as Cobrado
      if (wasNotPaid && form.status === 'Cobrado' && price > 0) {
        const cup_equiv = toCUP(price, form.currency, rate)
        await supabase.from('transactions').insert({
          type: 'income', category: 'Servicio técnico',
          description: `${form.service_type} — ${form.client}`,
          amount: price, currency: form.currency, cup_equiv
        })
        if (form.manager && commission_pct > 0) {
          const comm = price * commission_pct / 100
          await supabase.from('transactions').insert({
            type: 'expense', category: 'Comisión pagada',
            description: `Comisión ${commission_pct}% → ${form.manager} (${form.client})`,
            amount: comm, currency: form.currency, cup_equiv: toCUP(comm, form.currency, rate)
          })
          toast(`💸 Comisión de ${comm.toFixed(2)} ${form.currency} para ${form.manager} registrada`, { icon: '💸' })
        }
        toast.success('Servicio cobrado — ingreso registrado ✅')
      } else {
        toast.success('Orden actualizada ✅')
      }
    }
    setModal(null); load()
  }

  const StatusIcon = ({ s }: { s: string }) =>
    s === 'Cobrado' ? <CheckCircle2 size={12} /> : s === 'En Proceso' ? <Zap size={12} /> : <Clock size={12} />

  if (loading) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="text-orange-400" size={22} /> Servicios Técnicos
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Agenda de clientes y trabajos</p>
        </div>
        <button onClick={openNew} className="btn-primary text-sm">
          <Plus size={16} /> Nueva Orden
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pendientes"   value={String(pending)}   subtitle="por atender"     icon={Clock}         color="gold" />
        <StatCard title="En Proceso"   value={String(inProcess)} subtitle="trabajando ahora" icon={Zap}           color="cyan" />
        <StatCard title="Cobrados"     value={String(paid)}      subtitle="servicios pagados" icon={CheckCircle2} color="green" />
        <StatCard title="Revenue neto" value={fmtCUP(totalRev - totalComm)} subtitle={`Comisiones: ${fmtCUP(totalComm)}`} icon={Wrench} color="purple" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 glass p-1 w-fit rounded-xl">
        {[
          { key: 'all',        label: 'Todas' },
          { key: 'Pendiente',  label: '🟡 Pendiente' },
          { key: 'En Proceso', label: '🔵 En Proceso' },
          { key: 'Cobrado',    label: '✅ Cobrado' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
            {label}
          </button>
        ))}
      </div>

      <GlassCard className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full table-glass">
            <thead><tr>
              <th className="text-left">Fecha</th>
              <th className="text-left">Cliente</th>
              <th className="text-left">Servicio</th>
              <th className="text-left">Estado</th>
              <th className="text-right">Precio</th>
              <th className="text-left">Gestor</th>
              <th className="text-right">Comisión</th>
              <th></th>
            </tr></thead>
            <tbody>
              {displayed.map(o => {
                const comm = o.manager && o.commission_pct ? toCUP(o.price, o.currency, rate) * o.commission_pct / 100 : 0
                return (
                  <tr key={o.id}>
                    <td className="text-white/40 text-xs">{fmtDate(o.created_at)}</td>
                    <td>
                      <p className="text-white/90 font-medium">{o.client}</p>
                      {o.phone && <p className="text-white/30 text-xs">{o.phone}</p>}
                    </td>
                    <td>
                      <p className="text-white/70 text-sm">{o.service_type}</p>
                      {o.description && <p className="text-white/30 text-xs truncate max-w-[150px]">{o.description}</p>}
                    </td>
                    <td>
                      <span className={`badge text-xs ${STATUS_COLORS[o.status]}`}>
                        <StatusIcon s={o.status} /> {o.status}
                      </span>
                    </td>
                    <td className="text-right text-cyan-400 font-mono text-sm">
                      {o.price > 0 ? `${o.price.toLocaleString()} ${o.currency}` : <span className="text-white/20">—</span>}
                    </td>
                    <td className="text-white/50 text-xs">{o.manager || '—'}</td>
                    <td className="text-right">
                      {comm > 0 ? <span className="text-yellow-400/70 font-mono text-xs">{fmtCUP(comm)}</span> : <span className="text-white/20">—</span>}
                    </td>
                    <td>
                      <button onClick={() => openEdit(o)} className="p-1.5 text-white/30 hover:text-white/70 transition-colors">
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {displayed.length === 0 && <tr><td colSpan={8} className="text-center text-white/20 py-8">Sin órdenes</td></tr>}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {modal === 'new' ? '🔧 Nueva Orden' : `✏️ Editar Orden — ${(modal as ServiceOrder).client}`}
              </h2>
              <button onClick={() => setModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Cliente *</label>
                  <input className="input-glass" placeholder="Nombre" value={form.client} onChange={e => setForm({...form, client: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Teléfono</label>
                  <input className="input-glass" placeholder="+53..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Tipo de servicio</label>
                <select className="select-glass" value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})}>
                  {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Descripción del problema *</label>
                <textarea className="input-glass resize-none" rows={2} placeholder="Describe el trabajo..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Estado</label>
                  <select className="select-glass" value={form.status} onChange={e => setForm({...form, status: e.target.value as ServiceOrder['status']})}>
                    <option>Pendiente</option>
                    <option>En Proceso</option>
                    <option>Cobrado</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Precio</label>
                  <input className="input-glass" type="number" placeholder="0" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Moneda</label>
                  <select className="select-glass" value={form.currency} onChange={e => setForm({...form, currency: e.target.value as 'CUP'|'USD'})}>
                    <option value="CUP">CUP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Gestor (opcional)</label>
                  <input className="input-glass" placeholder="Nombre del gestor" value={form.manager} onChange={e => setForm({...form, manager: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Comisión %</label>
                  <input className="input-glass" type="number" placeholder="0" value={form.commission_pct} onChange={e => setForm({...form, commission_pct: e.target.value})} />
                </div>
              </div>
              {form.manager && form.commission_pct && form.price && (
                <p className="text-xs text-yellow-400/70 bg-yellow-400/5 rounded-lg px-3 py-2">
                  💸 Comisión de {form.manager}: {(parseFloat(form.price) * parseFloat(form.commission_pct) / 100).toFixed(2)} {form.currency}
                </p>
              )}
              {form.status === 'Cobrado' && modal !== 'new' && (modal as ServiceOrder)?.status !== 'Cobrado' && (
                <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl px-3 py-2 text-xs text-emerald-400">
                  ✅ Al guardar se registrará el ingreso automáticamente en Finanzas
                </div>
              )}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Notas</label>
                <textarea className="input-glass resize-none" rows={2} placeholder="Notas adicionales..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSubmit} className="btn-primary flex-1">
                  {modal === 'new' ? <><Plus size={16} /> Crear Orden</> : <>Guardar Cambios</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
