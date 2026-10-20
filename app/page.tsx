'use client'
import { useState, useEffect } from 'react'
import { Search, Trash2, Plus, Minus, Smartphone, Monitor, X } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Modal from '@/components/ui/Modal'
import { useStore } from '@/lib/store'
import { fmt, fmtQty, parseItemsText, CATEGORY_ICONS, STORE_INFO } from '@/lib/utils'
import { buildInvoiceHTML, buildThermalStrukHTML, openPrintPopup } from '@/lib/print'
import type { Product, Transaction } from '@/lib/types'
import { clsx } from 'clsx'

// ─────────────────────────────────────────────────────────────
// PRODUCT PICKER POPUP
// Muncul saat klik produk yang punya harga grosir / varian
// ─────────────────────────────────────────────────────────────
function ProductPicker({
  product,
  onSelect,
  onClose,
}: {
  product: Product
  onSelect: (name: string, price: number, unit: string, variant?: string) => void
  onClose: () => void
}) {
  const hasWholesale = product.priceWholesale > 0
  const hasVariants  = product.variants && product.variants.length > 0

  const [selectedVariant, setSelectedVariant] = useState<string>(
    hasVariants ? product.variants[0].id : ''
  )
  const [priceType, setPriceType] = useState<'retail' | 'wholesale'>('retail')

  const variantName = hasVariants
    ? product.variants.find(v => v.id === selectedVariant)?.name ?? ''
    : ''

  const price = priceType === 'wholesale' ? product.priceWholesale : product.price
  const unit  = priceType === 'wholesale' ? product.unitWholesale  : product.unit

  const displayName = hasVariants
    ? `${product.name} - ${variantName}`
    : product.name

  function handleAdd() {
    onSelect(displayName, price, unit, hasVariants ? selectedVariant : undefined)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 w-full max-w-sm shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-medium text-base">{product.name}</p>
            {product.size && <p className="text-xs text-gray-400 mt-0.5">Ukuran: {product.size}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={16}/></button>
        </div>

        {/* Varian warna */}
        {hasVariants && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Pilih Varian</p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg border text-sm font-medium transition',
                    selectedVariant === v.id
                      ? 'bg-brand-400 text-white border-brand-400'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'
                  )}
                >
                  {v.name}
                  <span className="ml-1.5 text-[10px] opacity-70">stok {v.stock}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pilihan harga */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Pilih Harga</p>
          <div className="flex flex-col gap-2">
            {/* Eceran */}
            <button
              onClick={() => setPriceType('retail')}
              className={clsx(
                'flex items-center justify-between p-3 rounded-xl border text-left transition',
                priceType === 'retail'
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div>
                <p className="text-sm font-medium">Eceran</p>
                <p className="text-xs text-gray-500">per {product.unit}</p>
              </div>
              <p className={clsx('text-base font-semibold', priceType === 'retail' ? 'text-brand-600' : 'text-gray-700')}>
                {fmt(product.price)}
              </p>
            </button>

            {/* Grosir */}
            {hasWholesale && (
              <button
                onClick={() => setPriceType('wholesale')}
                className={clsx(
                  'flex items-center justify-between p-3 rounded-xl border text-left transition',
                  priceType === 'wholesale'
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div>
                  <p className="text-sm font-medium">Grosir</p>
                  <p className="text-xs text-gray-500">
                    per {product.unitWholesale}
                    {product.qtyWholesale > 0 && ` · isi ${product.qtyWholesale} ${product.unit}`}
                  </p>
                  {product.qtyWholesale > 0 && (
                    <p className="text-xs text-green-600 mt-0.5">
                      ≈ {fmt(Math.round(product.priceWholesale / product.qtyWholesale))}/{product.unit}
                    </p>
                  )}
                </div>
                <p className={clsx('text-base font-semibold', priceType === 'wholesale' ? 'text-green-700' : 'text-gray-700')}>
                  {fmt(product.priceWholesale)}
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Produk:</span>
            <span className="font-medium">{displayName}</span>
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-gray-500">Harga:</span>
            <span className="font-medium text-brand-600">{fmt(price)}/{unit}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-outline flex-1">Batal</button>
          <button onClick={handleAdd} className="btn-blue flex-[2]">
            + Tambah ke Cart
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// QTY INPUT — boleh kosong saat mengetik, boleh desimal (0,5 / 0.5)
// ─────────────────────────────────────────────────────────────
function QtyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [txt, setTxt] = useState(String(value))
  useEffect(() => { setTxt(String(value)) }, [value])
  return (
    <input inputMode="decimal" value={txt}
      onChange={e => {
        const t = e.target.value.replace(',', '.')
        setTxt(t)
        const v = parseFloat(t)
        if (v > 0) onChange(Math.round(v * 1000) / 1000)
      }}
      onBlur={() => setTxt(String(value))}
      className="text-xs font-medium w-12 text-center border border-gray-200 rounded bg-white outline-none focus:border-brand-400 px-1 py-0.5" />
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN POS PAGE
// ─────────────────────────────────────────────────────────────
export default function PosPage() {
  const { products, cart, addToCart, changeQty, setQty, removeFromCart, clearCart, checkout, transactions } = useStore()

  const [activeCat, setActiveCat]       = useState('Semua')
  const [search, setSearch]             = useState('')
  const [showPay, setShowPay]           = useState(false)
  const [showReceipt, setShowReceipt]   = useState(false)
  const [cashInput, setCashInput]       = useState('')
  const [lastTrx, setLastTrx]           = useState<Transaction | null>(null)
  const [cartSnap, setCartSnap]         = useState<{ name: string; size?: string; qty: number; unit: string; price: number }[]>([])
  const [showPrintSelect, setPrintSelect] = useState(false)
  // Product picker popup
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null)
  // Checkout: cegah klik ganda & tampilkan pesan bila stok tidak cukup
  const [paying, setPaying]   = useState(false)
  const [payError, setPayError] = useState('')
  // Riwayat struk (transaksi tersimpan)
  const [showHistory, setShowHistory] = useState(false)
  const [hSearch, setHSearch]         = useState('')
  const [viewTrx, setViewTrx]         = useState<Transaction | null>(null)

  const categories = ['Semua', ...Array.from(new Set(products.map(p => p.category)))]

  const filtered = products.filter(p => {
    const matchCat = activeCat === 'Semua' || p.category === activeCat
    const matchQ   = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchQ
  })

  const total  = cart.reduce((s, i) => s + Math.round(i.price * i.qty), 0)
  const cash   = parseInt(cashInput.replace(/\D/g, ''), 10) || 0
  const change = cash - total
  const canPay = cash >= total && cash > 0

  const hList = hSearch.trim()
    ? transactions.filter(t => `${t.id} ${t.items} ${t.total}`.toLowerCase().includes(hSearch.trim().toLowerCase()))
    : transactions

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && showPay && canPay && !paying) confirmPayment()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  })

  // Klik produk — kalau ada harga grosir / varian, buka picker
  // Kalau tidak ada, langsung tambah ke cart
  function handleProductClick(p: Product) {
    if (p.stock === 0) return
    const hasWholesale = p.priceWholesale > 0
    const hasVariants  = p.variants && p.variants.length > 0
    if (hasWholesale || hasVariants) {
      setPickerProduct(p)
    } else {
      addToCart({ id: p.id, name: p.name, price: p.price, unit: p.unit })
    }
  }

  // Dari ProductPicker — tambah ke cart dengan nama/harga/unit yang sudah dipilih
  function handlePickerSelect(name: string, price: number, unit: string, variant?: string) {
    if (!pickerProduct) return
    // Gunakan id produk asli, tapi nama/harga/unit dari pilihan
    addToCart({ id: pickerProduct.id, name, price, unit, variant })
  }

  async function confirmPayment() {
    if (paying) return
    setPaying(true)
    setPayError('')
    try {
      // Checkout atomik: server mencatat transaksi DAN mengurangi stok
      // dalam satu transaksi database — tidak ada lagi penjualan yang
      // tercatat tanpa stok terpotong (atau stok minus).
      const trx = await checkout(cart, cash)
      const snap = cart.map(i => ({
        name: i.name, qty: i.qty, unit: i.unit, price: i.price,
      }))
      setCartSnap(snap)
      setLastTrx(trx)
      setShowPay(false)
      setShowReceipt(true)
    } catch (e) {
      // Stok tidak cukup / produk sudah diubah kasir lain → tampilkan pesan
      setPayError(e instanceof Error ? e.message : 'Checkout gagal, coba lagi')
    } finally {
      setPaying(false)
    }
  }

  function newTransaction() {
    clearCart()
    setShowReceipt(false)
    setLastTrx(null)
    setCashInput('')
    setCartSnap([])
    setPayError('')
  }

  return (
    <div className="flex min-h-screen pt-14 pb-16 md:pt-0 md:pb-0">
      <Sidebar />

      <main className="flex flex-1 flex-col md:flex-row min-w-0 overflow-x-hidden">
        {/* ── Left: Products ─────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 p-3 md:p-4 gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input className="flex-1 text-sm outline-none bg-transparent"
              placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button key={c} onClick={() => setActiveCat(c)}
                className={clsx(
                  'px-4 py-1.5 rounded-full text-sm whitespace-nowrap border transition',
                  activeCat === c
                    ? 'bg-brand-400 text-white border-brand-400 font-medium'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-brand-50 hover:text-brand-800 hover:border-brand-200'
                )}>
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-gray-400 text-sm py-16">Produk tidak ditemukan</p>
            )}
            {filtered.map(p => {
              const hasWholesale = p.priceWholesale > 0
              const hasVariants  = p.variants && p.variants.length > 0
              const needsPicker  = hasWholesale || hasVariants
              return (
                <button key={p.id}
                  onClick={() => handleProductClick(p)}
                  disabled={p.stock === 0}
                  className={clsx(
                    'relative bg-white border rounded-xl p-3 text-left transition',
                    p.stock === 0
                      ? 'opacity-50 cursor-not-allowed border-gray-200'
                      : 'border-gray-200 hover:border-brand-200 hover:bg-brand-50 active:scale-95'
                  )}>
                  {p.bestseller && <span className="absolute top-2 right-2 badge badge-amber text-[10px]">Terlaris</span>}
                  {/* Badge grosir */}
                  {hasWholesale && (
                    <span className="absolute top-2 left-2 badge bg-green-50 text-green-700 text-[10px]">Grosir</span>
                  )}
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mb-2 text-lg">
                    {CATEGORY_ICONS[p.category] ?? '📦'}
                  </div>
                  <p className="text-sm font-medium text-gray-900 leading-tight mb-1">{p.name}</p>
                  <p className="text-sm text-brand-600 font-medium">{fmt(p.price)}</p>
                  {hasWholesale && (
                    <p className="text-[11px] text-green-600">{fmt(p.priceWholesale)}/{p.unitWholesale}</p>
                  )}
                  {/* Varian preview */}
                  {hasVariants && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {p.variants.slice(0, 3).map(v => (
                        <span key={v.id} className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">{v.name}</span>
                      ))}
                      {p.variants.length > 3 && <span className="text-[10px] text-gray-400">+{p.variants.length - 3}</span>}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">Stok: {p.stock}</p>
                  {needsPicker && (
                    <p className="text-[10px] text-brand-400 mt-0.5">Tap untuk pilih →</p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Right: Cart ──────────────────────────────── */}
        <div className="w-full md:w-72 flex flex-col bg-white border-t md:border-t-0 md:border-l border-gray-200 md:sticky md:top-0 md:self-start md:max-h-screen">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-sm">Order Saat Ini</p>
              <p className="text-xs text-gray-400">{fmtQty(Math.round(cart.reduce((s, i) => s + i.qty, 0) * 1000) / 1000)} item</p>
            </div>
            <button onClick={() => { setHSearch(''); setShowHistory(true) }}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-800 transition">
              🧾 Struk
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col scrollbar-thin">
            <div className="px-3 py-3 flex flex-col gap-2">
              {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300 gap-2">
                  <span className="text-4xl">🛒</span>
                  <p className="text-xs">Belum ada item</p>
                </div>
              )}
              {cart.map(item => (
                <div key={`${item.id}-${item.variant ?? ''}`} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {fmt(item.price)} × {item.qty} = {fmt(item.price * item.qty)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(item.id, item.variant, -0.5)} className="w-6 h-6 rounded border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 text-gray-500 text-xs font-bold">½-</button>
                    <button onClick={() => changeQty(item.id, item.variant, -1)} className="w-6 h-6 rounded border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100"><Minus size={11}/></button>
                    <QtyInput value={item.qty} onChange={v => setQty(item.id, item.variant, v)} />
                    <button onClick={() => changeQty(item.id, item.variant, 1)} className="w-6 h-6 rounded border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100"><Plus size={11}/></button>
                  </div>
                  <button onClick={() => removeFromCart(item.id, item.variant)} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition">
                    <Trash2 size={11}/>
                  </button>
                </div>
              ))}
            </div>
            {/* Summary sticky di bawah — mengikuti scroll & selalu terlihat */}
            <div className="sticky bottom-0 px-4 py-4 border-t border-gray-200 bg-white flex flex-col gap-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span><span>{fmt(total)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
              <button onClick={() => { setCashInput(''); setShowPay(true) }} disabled={cart.length === 0} className="btn-blue w-full py-3">
                Bayar Sekarang
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Product Picker Popup ───────────────────────── */}
      {pickerProduct && (
        <ProductPicker
          product={pickerProduct}
          onSelect={handlePickerSelect}
          onClose={() => setPickerProduct(null)}
        />
      )}

      {/* ── Payment Modal ─────────────────────────────── */}
      <Modal open={showPay} onClose={() => setShowPay(false)} title="Pembayaran — Cash">
        <div className="flex flex-col gap-3">
          <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
            {cart.map((item, i) => (
              <div key={i} className="flex justify-between text-sm text-gray-600 py-1 border-b border-gray-100 last:border-0">
                <span>{item.name} ×{item.qty}</span>
                <span>{fmt(item.price * item.qty)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-base font-semibold py-2 border-t border-gray-200">
            <span>Total</span><span>{fmt(total)}</span>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Uang diterima</label>
            <input type="text" inputMode="numeric" autoFocus className="input" placeholder="0"
              value={cashInput ? parseInt(cashInput, 10).toLocaleString('id-ID') : ''}
              onChange={e => setCashInput(e.target.value.replace(/\D/g, ''))} />
          </div>
          {cash > 0 && cash >= total && (
            <div className="bg-green-50 rounded-lg py-3 text-center">
              <p className="text-xs text-green-600 mb-1">Kembalian</p>
              <p className="text-2xl font-semibold text-green-800">{fmt(change)}</p>
            </div>
          )}
          {payError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-red-700 font-medium">⚠ {payError}</p>
              <p className="text-[11px] text-red-500 mt-1">
                Transaksi belum tercatat. Periksa stok produk, lalu coba lagi.
              </p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowPay(false)} disabled={paying} className="btn-outline flex-1">Batal</button>
            <button onClick={confirmPayment} disabled={!canPay || paying} className="btn-blue flex-[2]">
              {paying ? 'Memproses…' : 'Konfirmasi (Enter)'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Print selector ─────────────────────────────── */}
      {showPrintSelect && lastTrx && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm shadow-lg">
            <p className="font-medium text-base mb-1">Pilih Metode Cetak</p>
            <p className="text-xs text-gray-500 mb-4">Pilih sesuai printer yang digunakan</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => {
                const inv = {
                  id: lastTrx.id, custId: 'UMUM', custName: 'Pembeli Umum',
                  date: new Date().toISOString().slice(0,10), due: new Date().toISOString().slice(0,10),
                  items: cartSnap.map(i => ({ name:i.name, size:i.size||'', qty:i.qty, unit:i.unit, price:i.price, total:i.price*i.qty })),
                  total: lastTrx.total, status: 'Lunas' as const, note: ''
                }
                openPrintPopup(buildInvoiceHTML(inv)); setPrintSelect(false)
              }} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition text-left">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0"><Monitor size={20} className="text-brand-600"/></div>
                <div><p className="font-medium text-sm">Invoice 21×14cm</p><p className="text-xs text-gray-500">Printer desktop / dot matrix</p></div>
              </button>
              <button onClick={() => { openPrintPopup(buildThermalStrukHTML(lastTrx, cartSnap, '58mm')); setPrintSelect(false) }}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition text-left">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><Smartphone size={20} className="text-green-600"/></div>
                <div><p className="font-medium text-sm">Struk Thermal 58mm</p><p className="text-xs text-gray-500">Bluetooth printer di HP</p></div>
              </button>
              <button onClick={() => { openPrintPopup(buildThermalStrukHTML(lastTrx, cartSnap, '80mm')); setPrintSelect(false) }}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition text-left">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0"><Smartphone size={20} className="text-amber-600"/></div>
                <div><p className="font-medium text-sm">Struk Thermal 80mm</p><p className="text-xs text-gray-500">Bluetooth printer 80mm di HP</p></div>
              </button>
            </div>
            <button onClick={() => setPrintSelect(false)} className="btn-outline w-full mt-3">Batal</button>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ─────────────────────────────── */}
      <Modal open={showReceipt} onClose={newTransaction} title={`Invoice — ${lastTrx?.id ?? ''}`} size="md">
        {lastTrx && (
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs">
              <p className="font-bold text-center text-sm mb-0.5">{STORE_INFO.name}</p>
              <p className="text-center text-gray-400 mb-2">{lastTrx.date} {lastTrx.time} · {lastTrx.id}</p>
              <hr className="border-dashed border-gray-300 mb-2"/>
              {cartSnap.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span>{item.name} ×{item.qty}</span>
                  <span>{fmt(item.price * item.qty)}</span>
                </div>
              ))}
              <hr className="border-dashed border-gray-300 my-2"/>
              <div className="flex justify-between font-bold"><span>Total</span><span>{fmt(lastTrx.total)}</span></div>
              <div className="flex justify-between text-gray-500 mt-0.5"><span>Cash</span><span>{fmt(lastTrx.cash)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Kembalian</span><span>{fmt(lastTrx.change)}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPrintSelect(true)} className="btn-blue flex-1 py-2.5">🖨 Cetak</button>
              <button onClick={newTransaction} className="btn-outline flex-1 py-2.5">Transaksi Baru</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Riwayat struk ─────────────────────────────── */}
      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Struk Tersimpan" size="md">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input className="flex-1 text-sm outline-none bg-transparent" placeholder="Cari no. struk / nama barang…"
              value={hSearch} onChange={e => setHSearch(e.target.value)} />
          </div>
          <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-2 scrollbar-thin">
            {hList.length === 0 && <p className="text-center text-sm text-gray-400 py-8">Belum ada struk</p>}
            {hList.map(t => (
              <button key={t.id} onClick={() => { setViewTrx(t); setShowHistory(false) }}
                className="text-left bg-gray-50 rounded-lg px-3 py-2 border border-transparent hover:bg-brand-50 hover:border-brand-200 transition">
                <div className="flex justify-between text-xs font-medium">
                  <span>{t.date} {t.time}</span><span>{fmt(t.total)}</span>
                </div>
                <p className="text-[11px] text-gray-500 truncate">{t.id} · {t.items}</p>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Detail struk lama ─────────────────────────── */}
      <Modal open={!!viewTrx} onClose={() => setViewTrx(null)} title={`Struk — ${viewTrx?.id ?? ''}`} size="md">
        {viewTrx && (
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs">
              <p className="font-bold text-center text-sm mb-0.5">{STORE_INFO.name}</p>
              <p className="text-center text-gray-400 mb-2">{viewTrx.date} {viewTrx.time} · {viewTrx.id}</p>
              <hr className="border-dashed border-gray-300 mb-2"/>
              {parseItemsText(viewTrx.items).map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span>{item.name} ×{fmtQty(item.qty)}</span>
                </div>
              ))}
              <hr className="border-dashed border-gray-300 my-2"/>
              <div className="flex justify-between font-bold"><span>Total</span><span>{fmt(viewTrx.total)}</span></div>
              <div className="flex justify-between text-gray-500 mt-0.5"><span>Cash</span><span>{fmt(viewTrx.cash)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Kembalian</span><span>{fmt(viewTrx.change)}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openPrintPopup(buildThermalStrukHTML(viewTrx, parseItemsText(viewTrx.items).map(i => ({ ...i, unit: '' })), '58mm'))}
                className="btn-outline flex-1 py-2.5">🖨 58mm</button>
              <button onClick={() => openPrintPopup(buildThermalStrukHTML(viewTrx, parseItemsText(viewTrx.items).map(i => ({ ...i, unit: '' })), '80mm'))}
                className="btn-outline flex-1 py-2.5">🖨 80mm</button>
              <button onClick={() => setViewTrx(null)} className="btn-blue flex-1 py-2.5">Tutup</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
