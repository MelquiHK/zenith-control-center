'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toCUP, fmtCUP, fmtDate } from '@/lib/utils'
import { Product, Sale } from '@/types'
import GlassCard from '@/components/GlassCard'
import StatCard from '@/components/StatCard'
import toast from 'react-hot-toast'
import { Package, Plus, ShoppingCart, AlertTriangle, X, Edit2, ArrowRight } from 'lucide-react'

type Tab = 'stock' | 'sales'

const CATEGORIES = ['Cargadores', 'Accesorios', 'Componentes', 'Pantallas', 'Baterías', 'Cables', 'Otro']

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [sales,    setSales]    = useState<Sale[]>([])
  const [rate,     setRate]     = useState(540)
  const [tab,      setTab]      = useState<Tab>('stock')
  const [loading,  setLoading]  = useState(true)
  const [prodModal, setProdModal] = useState<Product | null | 'new'>(null)
  const [saleModal, setSaleModal] = useState(false)

  const [prodForm, setProdForm] = useState({
    name: '', category: 'Cargadores', stock: '', price_cup: '', price_usd: ''
  })
  const [saleForm, setSaleForm] = useState({
    product_id: '', quantity: '1', currency: 'CUP' as 'CUP'|'USD',
    unit_price: '', client: '', notes: ''
  })

  const load = async () => {
    const [pRes, sRes, setRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('sales').select('*').order('created_at', { ascending: false }),
      supabase.from('settings').select('*').single(),
    ])
    if (pRes.data) setProducts(pRes.data)
    if (sRes.data) setSales(sRes.data)
    if (setRes.data) setRate(setRes.data.exchange_rate)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const lowStock    = products.filter(p => p.stock < 3)
  const totalValue  = products.reduce((s, p) => s + p.stock * p.price_cup, 0)
  const totalSalesVal = sales.reduce((s, sl) => s + sl.cup_equiv, 0)

  const openEdit = (p: Product) => {
    setProdForm({ name: p.name, category: p.category, stock: String(p.stock), price_cup: String(p.price_cup), price_usd: String(p.price_usd) })
    setProdModal(p)
  }
  const openNew = () => {
    setProdForm({ name: '', category: 'Cargadores', stock: '', price_cup: '', price_usd: '' })
    setProdModal('new')
  }

  const handleSaveProduct = async () => {
    if (!prodForm.name || !prodForm.price_cup) { toast.error('Completa los campos requeridos'); return }
    const payload = {
      name: prodForm.name, category: prodForm.category,
      stock: parseInt(prodForm.stock || '0'),
      price_cup: parseFloat(prodForm.price_cup || '0'),
      price_usd: parseFloat(prodForm.price_usd || '0'),
    }
    if (prodModal === 'new') {
      const { error } = await supabase.from('products').insert(payload)
      if (error) { toast.error('Error al guardar'); return }
      toast.success('Producto agregado ✅')
    } else if (prodModal && typeof prodModal === 'object') {
      const { error } = await supabase.from('products').update(payload).eq('id', prodModal.id)
      if (error) { toast.error('Error al guardar'); return }
      toast.success('Producto actualizado ✅')
    }
    setProdModal(null); load()
  }

  const openSale = (p?: Product) => {
    setSaleForm({
      product_id: p?.id || '',
      quantity: '1',
      currency: 'CUP',
      unit_price: p ? String(p.price_cup) : '',
      client: '',
      notes: ''
    })
    setSaleModal(true)
  }

  const handleSale = async () => {
    const product = products.find(p => p.id === saleForm.product_id)
    if (!product) { toast.error('Selecciona un producto'); return }
    const qty = parseInt(saleForm.quantity || '1')
    if (qty > product.stock) { toast.error(`Stock insuficiente (disponible: ${product.stock})`); return }
    if (!saleForm.unit_price) { toast.error('Ingresa el precio'); return }

    const unit_price = parseFloat(saleForm.unit_price)
    const total      = unit_price * qty
    const cup_equiv  = toCUP(total, saleForm.currency, rate)

    // Insert sale
    const { error: saleErr } = await supabase.from('sales').insert({
      product_id: product.id, product_name: product.name,
      category: product.category, quantity: qty,
      unit_price, total, currency: saleForm.currency,
      cup_equiv, client: saleForm.client || 'Cliente anónimo',
      notes: saleForm.notes
    })
    if (saleErr) { toast.error('Error al registrar venta'); return }

    // Update stock
    await supabase.from('products').update({ stock: product.stock - qty }).eq('id', product.id)

    // Auto-register income
    await supabase.from('transactions').insert({
      type: 'income', category: 'Venta producto',
      description: `Venta ${qty}x ${product.name} a ${saleForm.client || 'Cliente anónimo'}`,
      amount: total, currency: saleForm.currency, cup_equiv
    })

    toast.success('Venta registrada ✅')
    if (product.stock - qty < 3) toast(`⚠️ Stock de "${product.name}" bajo`, { icon: '⚠️' })
    setSaleModal(false); load()
  }

  const selectedProduct = products.find(p => p.id === saleForm.product_id)

  if (loading) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="text-blue-400" size={22} /> Inventario
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Stock y ventas de productos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openNew} className="btn-secondary text-sm px-3 py-2">
            <Plus size={14} /> Producto
          </button>
          <button onClick={() => openSale()} className="btn-primary text-sm px-3 py-2">
            <ShoppingCart size={14} /> Venta
          </button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <GlassCard className="p-4 border border-yellow-400/20 bg-yellow-400/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-400 mb-1">Stock crítico (&lt;3 unidades)</p>
              <div className="flex flex-wrap gap-2">
                {lowStock.map(p => (
                  <span key={p.id} className="badge text-yellow-400 bg-yellow-400/10 border-yellow-400/30 text-xs">
                    {p.name}: {p.stock} ud{p.stock !== 1 ? 's' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Productos"     value={String(products.length)}  subtitle="registrados"          icon={Package} color="cyan" />
        <StatCard title="Stock crítico" value={String(lowStock.length)}   subtitle="menos de 3 unidades"  icon={AlertTriangle} color={lowStock.length > 0 ? 'red' : 'green'} />
        <StatCard title="Valor en stock" value={fmtCUP(totalValue)}        subtitle="precio de venta CUP" icon={Package} color="gold" />
        <StatCard title="Total ventas"  value={fmtCUP(totalSalesVal)}     subtitle={`${sales.length} transacciones`} icon={ShoppingCart} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass p-1 w-fit rounded-xl">
        {(['stock','sales'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
            {t === 'stock' ? '📦 Stock' : '🛒 Ventas'}
          </button>
        ))}
      </div>

      {tab === 'stock' && (
        <GlassCard className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full table-glass">
              <thead><tr>
                <th className="text-left">Producto</th>
                <th className="text-left">Categoría</th>
                <th className="text-center">Stock</th>
                <th className="text-right">P. CUP</th>
                <th className="text-right">P. USD</th>
                <th className="text-right">Valor stock</th>
                <th></th>
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium text-white">{p.name}</td>
                    <td className="text-white/50 text-xs">{p.category}</td>
                    <td className="text-center">
                      <span className={`badge text-xs ${p.stock < 3 ? 'text-red-400 bg-red-400/10 border-red-400/30' : p.stock < 5 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="text-right text-white/70 font-mono text-sm">{p.price_cup.toLocaleString()}</td>
                    <td className="text-right text-white/70 font-mono text-sm">${p.price_usd.toFixed(2)}</td>
                    <td className="text-right text-cyan-400/70 font-mono text-xs">{fmtCUP(p.stock * p.price_cup)}</td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-white/30 hover:text-white/70 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => openSale(p)} className="p-1.5 text-cyan-400/50 hover:text-cyan-400 transition-colors">
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {tab === 'sales' && (
        <GlassCard className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full table-glass">
              <thead><tr>
                <th className="text-left">Fecha</th>
                <th className="text-left">Producto</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Total</th>
                <th className="text-right">CUP equiv.</th>
                <th className="text-left">Cliente</th>
              </tr></thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td className="text-white/40 text-xs">{fmtDate(s.created_at)}</td>
                    <td className="text-white/80">{s.product_name}</td>
                    <td className="text-center text-white/60">{s.quantity}</td>
                    <td className="text-right text-emerald-400 font-mono text-sm">
                      +{s.total.toLocaleString()} {s.currency}
                    </td>
                    <td className="text-right text-emerald-400/60 font-mono text-xs">{fmtCUP(s.cup_equiv)}</td>
                    <td className="text-white/50">{s.client}</td>
                  </tr>
                ))}
                {sales.length === 0 && <tr><td colSpan={6} className="text-center text-white/20 py-8">Sin ventas</td></tr>}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Product Modal */}
      {prodModal && (
        <div className="modal-overlay" onClick={() => setProdModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {prodModal === 'new' ? '+ Nuevo Producto' : `✏️ Editar: ${(prodModal as Product).name}`}
              </h2>
              <button onClick={() => setProdModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Nombre *</label>
                <input className="input-glass" placeholder="Ej. Cargador 65W USB-C" value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Categoría</label>
                <select className="select-glass" value={prodForm.category} onChange={e => setProdForm({...prodForm, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Stock</label>
                  <input className="input-glass" type="number" placeholder="0" value={prodForm.stock} onChange={e => setProdForm({...prodForm, stock: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Precio CUP *</label>
                  <input className="input-glass" type="number" placeholder="0" value={prodForm.price_cup} onChange={e => setProdForm({...prodForm, price_cup: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Precio USD</label>
                  <input className="input-glass" type="number" placeholder="0.00" value={prodForm.price_usd} onChange={e => setProdForm({...prodForm, price_usd: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setProdModal(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSaveProduct} className="btn-primary flex-1">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sale Modal */}
      {saleModal && (
        <div className="modal-overlay" onClick={() => setSaleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">🛒 Registrar Venta</h2>
              <button onClick={() => setSaleModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Producto</label>
                <select className="select-glass" value={saleForm.product_id}
                  onChange={e => {
                    const p = products.find(pr => pr.id === e.target.value)
                    setSaleForm({...saleForm, product_id: e.target.value, unit_price: p ? String(saleForm.currency === 'CUP' ? p.price_cup : p.price_usd) : ''})
                  }}>
                  <option value="">Seleccionar...</option>
                  {products.filter(p => p.stock > 0).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Cantidad</label>
                  <input className="input-glass" type="number" min="1" value={saleForm.quantity}
                    onChange={e => setSaleForm({...saleForm, quantity: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Moneda</label>
                  <select className="select-glass" value={saleForm.currency}
                    onChange={e => {
                      const c = e.target.value as 'CUP'|'USD'
                      const p = products.find(pr => pr.id === saleForm.product_id)
                      setSaleForm({...saleForm, currency: c, unit_price: p ? String(c === 'CUP' ? p.price_cup : p.price_usd) : ''})
                    }}>
                    <option value="CUP">CUP</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Precio unitario</label>
                <input className="input-glass" type="number" placeholder="0.00" value={saleForm.unit_price}
                  onChange={e => setSaleForm({...saleForm, unit_price: e.target.value})} />
              </div>
              {saleForm.unit_price && saleForm.quantity && (
                <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-3 text-sm">
                  <span className="text-white/50">Total: </span>
                  <span className="text-emerald-400 font-bold">
                    {(parseFloat(saleForm.unit_price) * parseInt(saleForm.quantity)).toLocaleString()} {saleForm.currency}
                  </span>
                  {saleForm.currency === 'USD' && (
                    <span className="text-white/30 ml-2 text-xs">
                      ≈ {fmtCUP(parseFloat(saleForm.unit_price) * parseInt(saleForm.quantity) * rate)}
                    </span>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Cliente</label>
                <input className="input-glass" placeholder="Nombre del cliente (opcional)" value={saleForm.client}
                  onChange={e => setSaleForm({...saleForm, client: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setSaleModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSale} className="btn-success flex-1">
                  <ShoppingCart size={16} /> Confirmar Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
