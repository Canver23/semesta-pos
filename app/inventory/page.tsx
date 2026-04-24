'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Modal from '@/components/ui/Modal'
import { useStore } from '@/lib/store'
import { fmt, UNITS } from '@/lib/utils'
import type { Product } from '@/lib/types'
import { Pencil, Trash2, Tags, Plus, X } from 'lucide-react'

const EMPTY: Omit<Product, 'id'> = {
  name: '', category: 'Sterofoam', size: '', unit: 'Pcs',
  price: 0, stock: 0, bestseller: false,
}

export default function InventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct, allCategories, customCategories, addCategory, deleteCategory } = useStore()
  const categories = allCategories()

  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [modal, setModal]         = useState(false)
  const [catModal, setCatModal]   = useState(false)
  const [editing, setEditing]     = useState<Product | null>(null)
  const [form, setForm]           = useState<Omit<Product, 'id'>>(EMPTY)
  const [newCat, setNewCat]       = useState('')

  const filtered = products.filter(p =>
    (!search    || p.name.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || p.category === catFilter)
  )

  function openAdd()             { setEditing(null); setForm({ ...EMPTY, category: categories[0] || 'Sterofoam' }); setModal(true) }
  function openEdit(p: Product)  { setEditing(p); setForm({ ...p }); setModal(true) }
  async function save() {
    if (!form.name.trim()) return
    editing ? await updateProduct(editing.id, form) : await addProduct(form)
    setModal(false)
  }
  const f = (key: keyof typeof form, val: unknown) => setForm(prev => ({ ...prev, [key]: val }))

  return (
    <div className="flex min-h-screen pt-14 pb-16 md:pt-0 md:pb-0">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold">Inventori</h1>
          <div className="flex gap-2">
            <button onClick={() => setCatModal(true)} className="btn-outline">
              <Tags size={14}/> Kelola Kategori
            </button>
            <button onClick={openAdd} className="btn-blue">+ Produk Baru</button>
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
            <th>Nama Produk</th><th>Kategori</th><th>Ukuran</th>
            <th>Satuan</th><th>Harga Umum</th><th>Stok</th><th>Aksi</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400">Tidak ada produk</td></tr>}
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <span className="font-medium">{p.name}</span>
                  {p.bestseller && <span className="badge badge-amber ml-2 text-[10px]">Terlaris</span>}
                </td>
                <td><span className="badge badge-blue">{p.category}</span></td>
                <td className="text-gray-500">{p.size || '-'}</td>
                <td className="text-gray-500">{p.unit}</td>
                <td className="font-medium text-brand-600">{fmt(p.price)}</td>
                <td className={p.stock < 50 ? 'text-red-600 font-medium' : 'text-green-700'}>{p.stock}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="btn btn-outline btn-sm"><Pencil size={12}/> Edit</button>
                    <button onClick={() => { if (confirm(`Hapus ${p.name}?`)) deleteProduct(p.id).catch(console.error) }} className="btn btn-danger btn-sm"><Trash2 size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add/Edit Product Modal */}
        <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit: ${editing.name}` : 'Tambah Produk'}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nama Produk *</label>
                <input className="input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Sterofoam T1"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Kategori</label>
                <select className="input" value={form.category} onChange={e => f('category', e.target.value)}>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Ukuran</label>
                <input className="input" value={form.size} onChange={e => f('size', e.target.value)} placeholder="T1 / 20cm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Satuan</label>
                <select className="input" value={form.unit} onChange={e => f('unit', e.target.value)}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Harga (Rp)</label>
                <input className="input" type="number" value={form.price||''} onChange={e => f('price', parseFloat(e.target.value)||0)} placeholder="0"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Stok</label>
                <input className="input" type="number" value={form.stock||''} onChange={e => f('stock', parseInt(e.target.value)||0)} placeholder="0"/>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.bestseller} onChange={e => f('bestseller', e.target.checked)} className="w-4 h-4 rounded"/>
                  Tandai sebagai Terlaris
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(false)} className="btn-outline flex-1">Batal</button>
              <button onClick={save} className="btn-blue flex-[2]">Simpan</button>
            </div>
          </div>
        </Modal>

        {/* Category Management Modal */}
        <Modal open={catModal} onClose={() => setCatModal(false)} title="Kelola Kategori" size="sm">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Kategori bawaan (tidak bisa dihapus)</p>
              <div className="flex flex-wrap gap-2">
                {['Sterofoam','Wrapping','Kantong','Lainnya'].map(c => (
                  <span key={c} className="badge badge-gray">{c}</span>
                ))}
              </div>
            </div>

            {customCategories.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Kategori kustom</p>
                <div className="flex flex-wrap gap-2">
                  {customCategories.map(c => (
                    <span key={c} className="badge badge-blue flex items-center gap-1">
                      {c}
                      <button onClick={() => deleteCategory(c).catch(console.error)} className="hover:text-red-500 ml-0.5">
                        <X size={10}/>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-500 mb-2">Tambah kategori baru</p>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  placeholder="Contoh: Bubble Wrap"
                  onKeyDown={e => { if (e.key === 'Enter') { addCategory(newCat).then(() => setNewCat('')) } }}
                />
                <button
                  onClick={() => { addCategory(newCat); setNewCat('') }}
                  disabled={!newCat.trim()}
                  className="btn-blue"
                >
                  <Plus size={14}/> Tambah
                </button>
              </div>
            </div>

            <button onClick={() => setCatModal(false)} className="btn-outline w-full">Tutup</button>
          </div>
        </Modal>
      </main>
    </div>
  )
}
