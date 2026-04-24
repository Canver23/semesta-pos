'use client'
import { useState, useEffect } from 'react'
import { Search, Trash2, Plus, Minus } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Modal from '@/components/ui/Modal'
import { useStore } from '@/lib/store'
import { fmt, fmtDate, CATEGORY_ICONS, STORE_INFO } from '@/lib/utils'
import type { Transaction } from '@/lib/types'
import { clsx } from 'clsx'

// ─────────────────────────────────────────────────────────────
// BUILD STRUK HTML — layout invoice (21×14cm, sama dengan invoice pelanggan)
// Untuk transaksi kasir langsung (tanpa data pelanggan)
// ─────────────────────────────────────────────────────────────
function buildStrukHTML(trx: Transaction, cartSnapshot: { name: string; size?: string; qty: number; unit: string; price: number }[]): string {
  const TOTAL_ROWS = 14
  const itemRows = cartSnapshot.map(item => `
    <tr>
      <td class="td-left">${item.name}</td>
      <td class="td-center">${item.size || ''}</td>
      <td class="td-center">${item.qty}</td>
      <td class="td-center">${item.unit}</td>
      <td class="td-right">${fmt(item.price)}</td>
      <td class="td-right">${fmt(item.price * item.qty)}</td>
    </tr>`).join('')

  const blankCount = Math.max(0, TOTAL_ROWS - cartSnapshot.length)
  const blankRows  = Array.from({ length: blankCount })
    .map(() => `<tr><td class="td-blank"></td><td class="td-blank"></td><td class="td-blank"></td><td class="td-blank"></td><td class="td-blank"></td><td class="td-blank"></td></tr>`)
    .join('')

  // Parse date "d/m/yyyy" back to display
  const tglDisplay = trx.date.split('/').reverse().join('-') !== 'undefined'
    ? trx.date  // already display format dd/mm/yyyy from toLocaleDateString
    : trx.date

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${trx.id}</title>
  <style>
    @page {
      size: 21cm 14cm;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      background: white;
      color: #000;
      width: 21cm;
      height: 14cm;
      padding: 4mm 6mm 3mm 6mm;
      overflow: hidden;
    }
    .inv-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 4px;
      margin-bottom: 2mm;
    }
    .top-line { border-top: 2px solid #000; margin-bottom: 1.5mm; }
    .header-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 1.5mm;
      font-size: 9.5pt;
    }
    .header-right { text-align: right; }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 1mm;
    }
    .items-table th {
      border: 1px solid #000;
      padding: 1.5mm 2mm;
      text-align: center;
      font-weight: bold;
    }
    .items-table td { border: 1px solid #000; padding: 1mm 2mm; height: 5.2mm; }
    .td-left   { text-align: left; }
    .td-center { text-align: center; }
    .td-right  { text-align: right; }
    .td-blank  { border: 1px solid #000; height: 5.2mm; }
    .col-nama   { width: 35%; }
    .col-ukuran { width: 12%; }
    .col-qty    { width: 8%;  }
    .col-satuan { width: 11%; }
    .col-harga  { width: 17%; }
    .col-total  { width: 17%; }
    .bottom-line { border-top: 1px solid #000; margin: 1mm 0; }
    .footer {
      display: grid;
      grid-template-columns: 42% 58%;
      gap: 3mm;
      font-size: 11pt;
    }
    .pengirim-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid #000;
    }
    .pengirim-label { padding: 1mm 2mm; }
    .pengirim-val   { padding: 1mm 2mm; border-left: 1px solid #000; }
    .pembayaran-box { border: 1px solid #000; border-top: none; }
    .pembayaran-header {
      text-align: center;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding: 1mm;
    }
    .pembayaran-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid #000;
      font-size: 11pt;
    }
    .pembayaran-row:last-child { border-bottom: none; }
    .p-label { padding: 1mm 2mm; }
    .p-val   { padding: 1mm 2mm; border-left: 1px solid #000; }
    .total-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 0.5mm;
    }
    .total-box-label {
      border: 1px solid #000;
      padding: 1.5mm 3mm;
      font-weight: bold;
      text-align: center;
      font-size: 10pt;
    }
    .total-box-val {
      border: 1px solid #000;
      border-left: none;
      padding: 1.5mm 3mm;
      text-align: right;
      font-weight: bold;
      font-size: 10pt;
    }

    /* Tanda tangan — lebih tinggi untuk ruang tanda tangan */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      text-align: center;
      margin-top: 1.5mm;
    }
    .sig-box { font-size: 11pt; }
    .sig-line {
      border-top: 1px solid #000;
      margin-top: 12mm;
      padding-top: 1mm;
    }
  </style>
</head>
<body>

  <div class="inv-title">I N V O I C E</div>
  <div class="top-line"></div>

  <div class="header-row">
    <div>No Invoice: <strong>${trx.id}</strong></div>
    <div class="header-right">
      Kepada Yth, <strong>Pembeli Umum</strong> &nbsp;&nbsp; <strong>KASIR</strong>
      <br>
      Tanggal <strong>${tglDisplay}</strong> &nbsp; ${trx.time}
    </div>
  </div>

  <table class="items-table">
    <colgroup>
      <col class="col-nama"><col class="col-ukuran">
      <col class="col-qty"><col class="col-satuan">
      <col class="col-harga"><col class="col-total">
    </colgroup>
    <thead>
      <tr>
        <th>Nama Barang</th><th>Ukuran</th><th>Qty</th>
        <th>Satuan</th><th>Harga Satuan</th><th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${blankRows}
    </tbody>
  </table>

  <div class="bottom-line"></div>

  <div class="footer">
    <!-- Kiri: Pengirim + Pembayaran -->
    <div>
      <div class="pengirim-row">
        <div class="pengirim-label">Pengirim:</div>
        <div class="pengirim-val"></div>
      </div>
      <div class="pembayaran-box">
        <div class="pembayaran-header">Pembayaran</div>
        <div class="pembayaran-row">
          <div class="p-label">A/n:</div>
          <div class="p-val">${STORE_INFO.bankAN}</div>
        </div>
        <div class="pembayaran-row">
          <div class="p-label">Giro / Transfer: ${STORE_INFO.bank}</div>
          <div class="p-val">${STORE_INFO.bankAcc}</div>
        </div>
      </div>
    </div>

    <!-- Kanan: Total + Cash + Kembalian + Tanda tangan -->
    <div>
      <div class="total-section">
        <div class="total-box-label">TOTAL</div>
        <div class="total-box-val">${fmt(trx.total)}</div>
      </div>

      <div class="signatures">
        <div class="sig-box">
          Tanda Terima
          <div class="sig-line">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
        </div>
        <div class="sig-box">
          Hormat Kami,
          <div class="sig-line">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 800);
    };
  </script>
</body>
</html>`
}

// ─── Print struk via popup (sama metode dengan invoice) ───────
function printStrukPopup(
  trx: Transaction,
  cartSnapshot: { name: string; size?: string; qty: number; unit: string; price: number }[]
) {
  const w = window.open('', '_blank', 'width=900,height=650')
  if (!w) {
    alert('Pop-up diblokir browser.\nIzinkan pop-up: klik ikon kunci/info di address bar → izinkan pop-up untuk localhost.')
    return
  }
  w.document.open()
  w.document.write(buildStrukHTML(trx, cartSnapshot))
  w.document.close()
}

// ─────────────────────────────────────────────────────────────
// MAIN POS PAGE
// ─────────────────────────────────────────────────────────────
export default function PosPage() {
  const { products, cart, addToCart, changeQty, removeFromCart, clearCart, addTransaction } = useStore()

  const [activeCat, setActiveCat]   = useState('Semua')
  const [search, setSearch]         = useState('')
  const [showPay, setShowPay]       = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [cashInput, setCashInput]   = useState('')
  const [lastTrx, setLastTrx]       = useState<Transaction | null>(null)
  // Snapshot cart at payment time (karena cart dibersihkan setelah transaksi)
  const [cartSnap, setCartSnap]     = useState<{ name: string; size?: string; qty: number; unit: string; price: number }[]>([])

  const categories = ['Semua', ...Array.from(new Set(products.map(p => p.category)))]

  const filtered = products.filter(p => {
    const matchCat = activeCat === 'Semua' || p.category === activeCat
    const matchQ   = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchQ
  })

  const total  = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const cash   = parseFloat(cashInput) || 0
  const change = cash - total
  const canPay = cash >= total && cash > 0

  // Enter key shortcut
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && showPay && canPay) confirmPayment()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  })

async function confirmPayment() {
    const now = new Date()
    // Simpan snapshot cart SEBELUM di-clear
    const snap = cart.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.price }))
    setCartSnap(snap)

const trx = await addTransaction({
      date:   now.toLocaleDateString('id-ID'),
      time:   now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      items:  cart.map(i => `${i.name} ×${i.qty}`).join(', '),
      total, cash, change,
      method: 'Cash',
    })
    setLastTrx(trx)
    setShowPay(false)
    setShowReceipt(true)
  }

  function newTransaction() {
    clearCart()
    setShowReceipt(false)
    setLastTrx(null)
    setCashInput('')
    setCartSnap([])
  }

  return (
    <div className="flex min-h-screen pt-14 pb-16 md:pt-0 md:pb-0">
      <Sidebar />

      <main className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* ── Left: Products ─────────────────────────────── */}
        <div className="flex flex-col flex-1 p-3 md:p-4 gap-3 overflow-hidden min-h-0">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              className="flex-1 text-sm outline-none bg-transparent"
              placeholder="Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
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

          {/* Products grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto flex-1 scrollbar-thin">
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-gray-400 text-sm py-16">Produk tidak ditemukan</p>
            )}
            {filtered.map(p => (
              <button key={p.id}
                onClick={() => p.stock > 0 && addToCart({ id: p.id, name: p.name, price: p.price, unit: p.unit })}
                disabled={p.stock === 0}
                className={clsx(
                  'relative bg-white border rounded-xl p-3 text-left transition',
                  p.stock === 0
                    ? 'opacity-50 cursor-not-allowed border-gray-200'
                    : 'border-gray-200 hover:border-brand-200 hover:bg-brand-50 active:scale-95'
                )}>
                {p.bestseller && <span className="absolute top-2 right-2 badge badge-amber text-[10px]">Terlaris</span>}
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mb-2 text-lg">
                  {CATEGORY_ICONS[p.category] ?? '📦'}
                </div>
                <p className="text-sm font-medium text-gray-900 leading-tight mb-1">{p.name}</p>
                <p className="text-sm text-brand-600 font-medium">{fmt(p.price)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Stok: {p.stock}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Right: Cart ──────────────────────────────── */}
        <div className="w-full md:w-72 flex flex-col bg-white border-t md:border-t-0 md:border-l border-gray-200 max-h-64 md:max-h-none">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="font-medium text-sm">Order Saat Ini</p>
            <p className="text-xs text-gray-400">{cart.reduce((s, i) => s + i.qty, 0)} item</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 scrollbar-thin">
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                <span className="text-4xl">🛒</span>
                <p className="text-xs">Belum ada item</p>
              </div>
            )}
            {cart.map(item => (
              <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {fmt(item.price)} × {item.qty} = {fmt(item.price * item.qty)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => changeQty(item.id, -1)} className="w-6 h-6 rounded border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100"><Minus size={11}/></button>
                  <span className="text-xs font-medium w-5 text-center">{item.qty}</span>
                  <button onClick={() => changeQty(item.id, 1)}  className="w-6 h-6 rounded border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100"><Plus  size={11}/></button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition">
                  <Trash2 size={11}/>
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 py-4 border-t border-gray-200 flex flex-col gap-3">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span><span>{fmt(total)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span><span>{fmt(total)}</span>
            </div>
            <button
              onClick={() => { setCashInput(''); setShowPay(true) }}
              disabled={cart.length === 0}
              className="btn-blue w-full py-3"
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      </main>

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
            <input type="number" autoFocus className="input" placeholder="0"
              value={cashInput} onChange={e => setCashInput(e.target.value)} />
          </div>
          {cash > 0 && cash >= total && (
            <div className="bg-green-50 rounded-lg py-3 text-center">
              <p className="text-xs text-green-600 mb-1">Kembalian</p>
              <p className="text-2xl font-semibold text-green-800">{fmt(change)}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowPay(false)} className="btn-outline flex-1">Batal</button>
            <button onClick={confirmPayment} disabled={!canPay} className="btn-blue flex-[2]">
              Konfirmasi (Enter)
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Receipt Modal (preview sebelum print) ─────── */}
      <Modal open={showReceipt} onClose={newTransaction} title={`Invoice — ${lastTrx?.id ?? ''}`} size="md">
        {lastTrx && (
          <div className="flex flex-col gap-3">
            {/* Mini preview */}
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs">
              <p className="font-bold text-center text-sm mb-0.5">{STORE_INFO.name}</p>
              <p className="text-center text-gray-500 mb-0.5">{STORE_INFO.address}</p>
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
            <p className="text-xs text-gray-400 text-center">
              Cetak akan memakai layout Invoice 21×14cm (sama dengan invoice pelanggan)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => lastTrx && printStrukPopup(lastTrx, cartSnap)}
                className="btn-blue flex-1 py-2.5"
              >
                🖨 Cetak Invoice
              </button>
              <button onClick={newTransaction} className="btn-outline flex-1 py-2.5">
                Transaksi Baru
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
