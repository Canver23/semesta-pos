'use client'
import { useMemo, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { useStore } from '@/lib/store'
import { fmt } from '@/lib/utils'
import { Calculator, Save, Wallet, TrendingUp, Package } from 'lucide-react'

export default function ModalPage() {
  const { products, updateProduct, allCategories } = useStore()
  const categories = allCategories()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<number | null>(null)

  const filtered = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || p.category === catFilter)
  )

  const stats = useMemo(() => {
    let modal = 0, revenue = 0, profit = 0, filled = 0
    for (const p of products) {
      if (p.cost > 0) {
        modal  += p.cost * p.stock
        profit += (p.price - p.cost) * p.stock
        filled += 1
      }
      revenue += p.price * p.stock
    }
    return { modal, revenue, profit, filled }
  }, [products])

  function getDraft(id: number) {
    return drafts[id] !== undefined ? drafts[id] : (products.find(p => p.id === id)?.cost || '').toString()
  }

  async function save(id: number) {
    const val = parseFloat(drafts[id] ?? '')
    if (Number.isNaN(val)) return
    setSaving(id)
    try {
      await updateProduct(id, { cost: val })
      setDrafts(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex min-h-screen pt-14 pb-16 md:pt-0 md:pb-0">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Calculator size={20} className="text-brand-600"/> Harga Modal
          </h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="card flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-brand-50 text-brand-600"><Wallet size={20}/></div>
            <div>
              <p className="text-xs text-gray-500">Total Nilai Modal (Stok)</p>
              <p className="text-lg font-semibold">{fmt(stats.modal)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-50 text-green-700"><TrendingUp size={20}/></div>
            <div>
              <p className="text-xs text-gray-500">Estimasi Keuntungan</p>
              <p className={`text-lg font-semibold ${stats.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(stats.profit)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700"><Package size={20}/></div>
            <div>
              <p className="text-xs text-gray-500">Produk Terisi Modal</p>
              <p className="text-lg font-semibold">{stats.filled}<span className="text-sm text-gray-400"> / {products.length}</span></p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <input className="input flex-1" placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)}/>
          <select className="input w-48" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Semua Kategori</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <table className="data-table">
          <thead><tr>
            <th>Nama Produk</th><th>Kategori</th><th>Harga Jual</th>
            <th>Modal / Satuan</th><th>Keuntungan</th><th>Stok</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400">Tidak ada produk</td></tr>}
            {filtered.map(p => {
              const draft = getDraft(p.id)
              const cost  = parseFloat(draft)
              const isDirty = !Number.isNaN(cost) && cost !== p.cost
              const profit = !Number.isNaN(cost) ? p.price - cost : 0
              const margin = !Number.isNaN(cost) && p.price > 0 ? Math.round((profit / p.price) * 100) : 0
              return (
                <tr key={p.id}>
                  <td>
                    <span className="font-medium">{p.name}</span>
                    <span className="block text-xs text-gray-400">{p.size || '-'} · {p.unit}</span>
                  </td>
                  <td><span className="badge badge-blue">{p.category}</span></td>
                  <td className="font-medium text-brand-600">{fmt(p.price)}</td>
                  <td>
                    <input
                      type="number"
                      className="input w-36"
                      value={draft === '0' ? '' : draft}
                      placeholder="0"
                      onChange={e => setDrafts(prev => ({ ...prev, [p.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter' && isDirty) save(p.id) }}
                    />
                  </td>
                  <td>
                    {!Number.isNaN(cost) && cost > 0
                      ? <span className={`font-medium ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {fmt(profit)} <span className="text-xs text-gray-400">({margin}%)</span>
                        </span>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>
                  <td className="text-gray-500">{p.stock}</td>
                  <td>
                    {isDirty && (
                      <button onClick={() => save(p.id)} disabled={saving === p.id} className="btn btn-blue btn-sm">
                        <Save size={12}/> {saving === p.id ? '...' : 'Simpan'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </main>
    </div>
  )
}
