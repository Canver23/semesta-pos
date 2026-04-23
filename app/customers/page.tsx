'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Modal from '@/components/ui/Modal'
import { useStore } from '@/lib/store'
import { fmt, UNITS } from '@/lib/utils'
import type { Customer, CustomerPrice } from '@/lib/types'
import { Pencil, Trash2, Plus, X, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

const EMPTY_CUST: Omit<Customer, 'id'> = {
  name: '', phone: '', email: '', address: '', prices: [],
}

export default function CustomersPage() {
  const { customers, products, addCustomer, updateCustomer, deleteCustomer } = useStore()
  const router = useRouter()
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm]       = useState<Omit<Customer, 'id'>>(EMPTY_CUST)

  const filtered = customers.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  )

  function openAdd()           { setEditing(null); setForm(EMPTY_CUST); setModal(true) }
  function openEdit(c: Customer) { setEditing(c); setForm({ ...c, prices: c.prices.map(p => ({...p})) }); setModal(true) }
  const sf = (key: keyof typeof form, val: unknown) => setForm((p) => ({ ...p, [key]: val }))

  function addPriceRow() {
    setForm((p) => ({ ...p, prices: [...p.prices, { prodId: null, name: '', size: '', unit: 'Pcs', price: 0 }] }))
  }
  function addFromCatalog(prodId: number) {
    const prod = products.find((p) => p.id === prodId)
    if (!prod) return
    setForm((p) => ({
      ...p,
      prices: [...p.prices, { prodId: prod.id, name: prod.name, size: prod.size, unit: prod.unit, price: prod.price }],
    }))
  }
  function updatePriceRow(i: number, key: keyof CustomerPrice, val: unknown) {
    setForm((p) => {
      const prices = [...p.prices]
      prices[i] = { ...prices[i], [key]: val }
      return { ...p, prices }
    })
  }
  function removePriceRow(i: number) {
    setForm((p) => ({ ...p, prices: p.prices.filter((_, idx) => idx !== i) }))
  }

  async function save() {
    if (!form.name.trim()) return
    editing ? await updateCustomer(editing.id, form) : await addCustomer(form)
    setModal(false)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold">Database Pelanggan</h1>
          <button onClick={openAdd} className="btn-blue">+ Pelanggan Baru</button>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Setiap pelanggan memiliki daftar produk & harga sendiri yang berbeda dari harga umum.
        </p>

        <input
          className="input mb-4"
          placeholder="Cari nama atau nomor HP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <table className="data-table">
          <thead><tr>
            <th>Pelanggan</th><th>No. HP</th>
            <th>Alamat</th><th>Produk Khusus</th><th>Aksi</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Belum ada pelanggan</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-[11px] text-gray-400">{c.id}</p>
                </td>
                <td className="text-sm">{c.phone || '-'}</td>
                <td className="text-xs text-gray-500">{c.address || '-'}</td>
                <td>
                  <span className="badge badge-blue">{c.prices.length} produk</span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="btn btn-outline btn-sm">
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => router.push(`/invoices?custId=${c.id}`)}
                      className="btn btn-outline btn-sm text-brand-600"
                    >
                      <FileText size={12} /> Invoice
                    </button>
                    <button
                      onClick={() => { if (confirm(`Hapus ${c.name}?`)) deleteCustomer(c.id).catch(console.error) }}
                      className="btn btn-danger btn-sm"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Add/Edit Customer Modal ─────────────────── */}
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title={editing ? `Edit: ${editing.name}` : 'Tambah Pelanggan'}
          size="lg"
        >
          <div className="flex flex-col gap-3">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nama Pelanggan *</label>
                <input className="input" value={form.name} onChange={(e) => sf('name', e.target.value)} placeholder="Toko Bu Sari" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">No. HP / WhatsApp</label>
                <input className="input" value={form.phone} onChange={(e) => sf('phone', e.target.value)} placeholder="081234567890" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email</label>
                <input className="input" value={form.email} onChange={(e) => sf('email', e.target.value)} placeholder="toko@email.com" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Alamat</label>
                <input className="input" value={form.address} onChange={(e) => sf('address', e.target.value)} placeholder="Jl. Pasar Baru No.5" />
              </div>
            </div>

            {/* Custom price list */}
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Daftar Harga Khusus</p>
                <div className="flex gap-2">
                  <select
                    className="input text-xs py-1 w-48"
                    onChange={(e) => { if (e.target.value) addFromCatalog(parseInt(e.target.value)); e.target.value = '' }}
                    defaultValue=""
                  >
                    <option value="">+ Pilih dari katalog...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.size || '-'}) — {fmt(p.price)}</option>
                    ))}
                  </select>
                  <button onClick={addPriceRow} className="btn-outline btn-sm">
                    <Plus size={12} /> Baris Baru
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Kosongkan harga = pakai harga umum. "Baris Baru" untuk produk yang tidak ada di katalog.
              </p>

              {form.prices.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6 bg-gray-50 rounded-lg">
                  Belum ada harga khusus — pelanggan ini pakai harga umum semua.
                </p>
              )}

              {form.prices.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {['Nama Barang', 'Ukuran', 'Satuan', 'Harga Khusus (Rp)', 'vs Harga Umum', ''].map((h) => (
                          <th key={h} className="px-2 py-2 text-left text-gray-500 font-medium border-b border-gray-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.prices.map((row, i) => {
                        const gp = row.prodId ? products.find((p) => p.id === row.prodId)?.price : null
                        const diff = gp && row.price ? row.price - gp : null
                        const pct  = diff && gp ? Math.round((diff / gp) * 100) : null
                        return (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="px-1 py-1.5">
                              <input
                                className="input text-xs py-1"
                                value={row.name}
                                onChange={(e) => updatePriceRow(i, 'name', e.target.value)}
                                placeholder="Nama barang"
                              />
                            </td>
                            <td className="px-1 py-1.5">
                              <input
                                className="input text-xs py-1 w-20"
                                value={row.size}
                                onChange={(e) => updatePriceRow(i, 'size', e.target.value)}
                                placeholder="-"
                              />
                            </td>
                            <td className="px-1 py-1.5">
                              <select
                                className="input text-xs py-1 w-20"
                                value={row.unit}
                                onChange={(e) => updatePriceRow(i, 'unit', e.target.value)}
                              >
                                {UNITS.map((u) => <option key={u}>{u}</option>)}
                              </select>
                            </td>
                            <td className="px-1 py-1.5">
                              <input
                                className="input text-xs py-1 w-28"
                                type="number"
                                value={row.price || ''}
                                onChange={(e) => updatePriceRow(i, 'price', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {gp ? (
                                <span className="text-gray-400">{fmt(gp)} </span>
                              ) : null}
                              {pct !== null && (
                                <span className={pct < 0 ? 'text-red-500' : pct > 0 ? 'text-green-600' : 'text-gray-400'}>
                                  {pct < 0 ? `▼${Math.abs(pct)}%` : pct > 0 ? `▲${pct}%` : '= sama'}
                                </span>
                              )}
                              {!row.prodId && <span className="text-gray-400 italic">produk khusus</span>}
                            </td>
                            <td className="px-1 py-1.5">
                              <button onClick={() => removePriceRow(i)} className="text-gray-400 hover:text-red-500 p-1">
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(false)} className="btn-outline flex-1">Batal</button>
              <button onClick={save} className="btn-blue flex-[2]">Simpan Pelanggan</button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  )
}
