'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Modal from '@/components/ui/Modal'
import { useStore } from '@/lib/store'
import { fmt, fmtDate, todayISO, UNITS, STORE_INFO } from '@/lib/utils'
import type { Invoice, InvoiceItem } from '@/lib/types'
import { Printer, Plus, X, Trash2, Eye, Smartphone, Monitor, Pencil, Download } from 'lucide-react'
import { buildInvoiceHTML, buildThermalHTML, openPrintPopup } from '@/lib/print'
import { useRole } from '@/lib/use-role'


// ─────────────────────────────────────────────────────────────
// DOWNLOAD INVOICE sebagai file HTML
// Format nama: Invoice_NamaPembeli_YYYYMMDD
// ─────────────────────────────────────────────────────────────
function downloadInvoice(inv: Invoice) {
  // Format nama file: Invoice_NAMA_YYYYMMDD.pdf
  const tglRaw     = inv.date.replace(/-/g, '')
  const namaBersih = (inv.custName || 'Pembeli_Umum')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .replace(/\s+/g, '_')
    .toUpperCase()
  const filename = `Invoice_${namaBersih}_${tglRaw}.pdf`

  // Build invoice HTML content
  const invoiceHTML = buildInvoiceHTML(inv)

  // Create hidden iframe to render invoice, then print to PDF
  const printWindow = window.open('', '_blank', 'width=1,height=1')
  if (!printWindow) {
    alert('Pop-up diblokir. Izinkan pop-up di address bar.')
    return
  }

  // Write full HTML with print-to-PDF trigger
  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${filename}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
  <style>
    body { margin: 0; padding: 0; background: white; }
  </style>
</head>
<body>
  <div id="invoice-content">
    ${invoiceHTML.replace(/<script[\s\S]*?<\/script>/gi, '')}
  </div>
  <script>
    window.onload = function() {
      const element = document.getElementById('invoice-content')
      const opt = {
        margin:      [5, 5, 5, 5],
        filename:    '${filename}',
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF:       { unit: 'mm', format: [210, 140], orientation: 'landscape' }
      }
      html2pdf().set(opt).from(element).save().then(function() {
        setTimeout(function() { window.close() }, 500)
      })
    }
  <\/script>
</body>
</html>`)
  printWindow.document.close()
}

// ─────────────────────────────────────────────────────────────
// SHARED INVOICE FORM (dipakai oleh Create & Edit)
// ─────────────────────────────────────────────────────────────
interface InvoiceFormProps {
  open: boolean
  onClose: () => void
  defaultCustId?: string
  editInvoice?: Invoice | null   // kalau ada = mode edit
}

function InvoiceFormModal({ open, onClose, defaultCustId, editInvoice }: InvoiceFormProps) {
  const { customers, products, addInvoice, invoices, updateInvoice } = useStore()
  const isEdit = !!editInvoice

  const [isUmum, setIsUmum]     = useState(false)
  const [custId, setCustId]     = useState('')
  const [namaUmum, setNamaUmum] = useState('')
  const [date, setDate]         = useState(todayISO())
  const [due, setDue]           = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10)
  })
  const [note, setNote]   = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [catQ, setCatQ]   = useState('')
  const [catOpen, setCatOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Pre-fill form when editing
  useEffect(() => {
    if (editInvoice) {
      const isU = editInvoice.custId === 'UMUM'
      setIsUmum(isU)
      setCustId(isU ? '' : editInvoice.custId)
      setNamaUmum(isU ? editInvoice.custName : '')
      setDate(editInvoice.date)
      setDue(editInvoice.due)
      setNote(editInvoice.note)
      setItems(editInvoice.items.map(i => ({ ...i })))
    } else {
      // Reset for create
      setIsUmum(false)
      setCustId(defaultCustId ?? '')
      setNamaUmum('')
      setDate(todayISO())
      const d = new Date(); d.setDate(d.getDate() + 14)
      setDue(d.toISOString().slice(0, 10))
      setNote('')
      setItems([])
    }
  }, [editInvoice, defaultCustId, open])

  const cust     = customers.find(c => c.id === custId)
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const custName = isUmum
    ? (namaUmum.trim() || 'Pembeli Umum')
    : (cust?.name ?? '')

  function addFromCatalog(key: string) {
    if (!key) return
    let item: InvoiceItem | null = null
    if (key.startsWith('cust-') && cust) {
      const p = cust.prices[parseInt(key.split('-')[1])]
      if (p) item = { name: p.name, size: p.size, qty: 1, unit: p.unit, price: p.price, total: p.price }
    } else if (key.startsWith('prod-')) {
      const p = products.find(x => x.id === parseInt(key.split('-')[1]))
      if (p) item = { name: p.name, size: p.size, qty: 1, unit: p.unit, price: p.price, total: p.price }
    }
    if (item) setItems(prev => [...prev, item!])
  }

  function updateItem(i: number, key: keyof InvoiceItem, val: string | number) {
    setItems(prev => {
      const next = [...prev]
      const row  = { ...next[i], [key]: val }
      row.total  = row.qty * row.price
      next[i]    = row
      return next
    })
  }

  async function save() {
    if (!isUmum && !custId) return
    if (!items.length) return

    setSaving(true)
    try {
      if (isEdit && editInvoice) {
        // Update existing invoice
        await updateInvoice(editInvoice.id, {
          custId:   isUmum ? 'UMUM' : custId,
          custName,
          date, due,
          items,
          total: subtotal,
          note,
        })
      } else {
        await addInvoice({
          custId: isUmum ? 'UMUM' : custId,
          custName,
          date, due, items,
          total: subtotal,
          status: 'Belum Lunas',
          note,
        })
      }
      onClose()
    } catch (e) {
      alert('Gagal menyimpan invoice: ' + (e instanceof Error ? e.message : 'kesalahan tidak diketahui'))
    } finally {
      setSaving(false)
    }
  }

  const canSave = items.length > 0 && (isUmum || !!custId)

  // Cari item katalog (harga khusus pelanggan ★ didahulukan)
  const catKey = catQ.trim().toLowerCase()
  const catAll = [
    ...(!isUmum && cust ? cust.prices.map((p, i) => ({ key: `cust-${i}`, label: `${p.name}${p.size ? ` (${p.size})` : ''}`, price: p.price, star: true })) : []),
    ...products.map(p => ({ key: `prod-${p.id}`, label: `${p.name}${p.size ? ` (${p.size})` : ''}`, price: p.price, star: false })),
  ]
  const catHits = catAll.filter(o => o.label.toLowerCase().includes(catKey)).slice(0, 60)

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit Invoice — ${editInvoice?.id}` : 'Buat Invoice'} size="xl">
      <div className="flex flex-col gap-4">

        {/* Toggle Pelanggan / Umum */}
        <div className="flex gap-0 p-1 bg-gray-100 rounded-lg">
          {[
            { label: '👤 Pelanggan Terdaftar', val: false },
            { label: '🛒 Pembeli Umum / Eceran', val: true },
          ].map(({ label, val }) => (
            <button key={label} onClick={() => setIsUmum(val)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                isUmum === val ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              {isUmum ? 'Nama Pembeli (opsional)' : 'Pelanggan *'}
            </label>
            {isUmum ? (
              <input className="input" value={namaUmum}
                onChange={e => setNamaUmum(e.target.value)} placeholder="Pembeli Umum" />
            ) : (
              <select className="input" value={custId} onChange={e => setCustId(e.target.value)}>
                <option value="">-- Pilih Pelanggan --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Tanggal</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Jatuh Tempo</label>
            <input className="input" type="date" value={due} onChange={e => setDue(e.target.value)} />
          </div>
        </div>

        {!isUmum && cust && cust.prices.length > 0 && (
          <div className="bg-brand-50 rounded-lg px-3 py-2 text-xs text-brand-800">
            ★ {cust.name} punya {cust.prices.length} produk harga khusus — ada di dropdown bawah.
          </div>
        )}

        {isEdit && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            ✏️ Mode Edit — perubahan akan langsung menimpa data invoice {editInvoice?.id}. Status Lunas/Belum Lunas tidak berubah.
          </div>
        )}

        {/* Quick add — cari dari katalog */}
        <div className="flex gap-2 items-start">
          <div className="relative flex-1">
            <input className="input text-sm w-full" value={catQ} autoComplete="off"
              onChange={e => { setCatQ(e.target.value); setCatOpen(true) }}
              onFocus={() => setCatOpen(true)}
              onBlur={() => setCatOpen(false)}
              onKeyDown={e => { if (e.key === 'Escape') setCatOpen(false) }}
              placeholder="🔍 Cari barang dari katalog... (klik untuk lihat daftar)" />
            {catOpen && (
              <div className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                {catHits.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-400">Tidak ada barang cocok</div>
                )}
                {!catKey && catHits.some(o => o.star) && (
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-brand-700 bg-brand-50">★ Harga khusus pelanggan</div>
                )}
                {catHits.map(o => (
                  <button key={o.key} type="button" onMouseDown={e => e.preventDefault()}
                    onClick={() => { addFromCatalog(o.key); setCatQ(''); setCatOpen(false) }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left border-b border-gray-100 last:border-0 hover:bg-brand-50">
                    <span className="truncate">{o.star ? '★ ' : ''}{o.label}</span>
                    <span className="whitespace-nowrap text-gray-500">{fmt(o.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setItems(prev => [...prev, { name: '', size: '', qty: 1, unit: 'Pcs', price: 0, total: 0 }])}
            className="btn-outline whitespace-nowrap">
            <Plus size={13} /> Baris Kosong
          </button>
        </div>

        {/* Items table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['Nama Barang','Ukuran','Qty','Satuan','Harga Satuan','Total',''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-xs">
                  Pilih dari katalog atau klik Baris Kosong
                </td></tr>
              )}
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-1 py-1.5 w-1/4">
                    <input className="input text-xs py-1" value={item.name}
                      onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Nama barang" />
                  </td>
                  <td className="px-1 py-1.5 w-20">
                    <input className="input text-xs py-1" value={item.size}
                      onChange={e => updateItem(i, 'size', e.target.value)} placeholder="-" />
                  </td>
                  <td className="px-1 py-1.5 w-16">
                    <input className="input text-xs py-1 text-center"
                      type="number" step="0.001" min="0.001"
                      value={item.qty || ''}
                      onChange={e => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v) && v > 0) updateItem(i, 'qty', v)
                        else if (e.target.value === '') updateItem(i, 'qty', 0)
                      }}
                      onBlur={e => {
                        if (!e.target.value || parseFloat(e.target.value) <= 0)
                          updateItem(i, 'qty', 1)
                      }} />
                  </td>
                  <td className="px-1 py-1.5 w-20">
                    <select className="input text-xs py-1" value={item.unit}
                      onChange={e => updateItem(i, 'unit', e.target.value)}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1.5 w-32">
                    <input className="input text-xs py-1 text-right" type="number"
                      value={item.price || ''}
                      onChange={e => updateItem(i, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="0" />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium w-28 text-sm">{fmt(item.total)}</td>
                  <td className="px-1">
                    <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-gray-400 hover:text-red-500 p-1">
                      <X size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex justify-end">
          <div className="w-52">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
              <span>Total</span><span>{fmt(subtotal)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Catatan</label>
          <input className="input" value={note} onChange={e => setNote(e.target.value)}
            placeholder="Catatan tambahan (opsional)" />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Batal</button>
          <button onClick={save} disabled={!canSave || saving} className={`flex-[2] ${isEdit ? 'btn btn-outline border-amber-400 text-amber-700 hover:bg-amber-50' : 'btn-blue'}`}>
            {saving ? 'Menyimpan…' : isEdit ? '✏️ Simpan Perubahan' : 'Simpan Invoice'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// INVOICE PREVIEW
// ─────────────────────────────────────────────────────────────
function InvoicePreview({ inv }: { inv: Invoice }) {
  const TOTAL_ROWS = 14
  const blankCount = Math.max(0, TOTAL_ROWS - inv.items.length)

  return (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: '11pt', background: 'white', padding: '4mm', border: '1px solid #ccc' }}>
      <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', letterSpacing: '4px', marginBottom: '3mm' }}>
        I N V O I C E
      </div>
      <hr style={{ borderTop: '2px solid #000', marginBottom: '2mm' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '2mm', fontSize: '10pt' }}>
        <div>No Invoice: <strong>{inv.id}</strong></div>
        <div style={{ textAlign: 'right' }}>
          Kepada Yth, <strong>{inv.custName || 'Pembeli Umum'}</strong> &nbsp;&nbsp; <strong>ADMIN</strong>
          <br />Tanggal <strong>{fmtDate(inv.date)}</strong>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '1mm' }}>
        <colgroup>
          <col style={{ width: '35%' }} /><col style={{ width: '13%' }} />
          <col style={{ width: '8%' }} /><col style={{ width: '12%' }} />
          <col style={{ width: '16%' }} /><col style={{ width: '16%' }} />
        </colgroup>
        <thead>
          <tr>
            {['Nama Barang','Ukuran','Qty','Satuan','Harga Satuan','Total'].map(h => (
              <th key={h} style={{ border: '1px solid #000', padding: '1.5mm 2mm', textAlign: 'center', fontWeight: 'bold' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inv.items.map((item, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #000', padding: '1mm 2mm', height: '5mm' }}>{item.name}</td>
              <td style={{ border: '1px solid #000', padding: '1mm 2mm', textAlign: 'center' }}>{item.size||''}</td>
              <td style={{ border: '1px solid #000', padding: '1mm 2mm', textAlign: 'center' }}>{item.qty}</td>
              <td style={{ border: '1px solid #000', padding: '1mm 2mm', textAlign: 'center' }}>{item.unit}</td>
              <td style={{ border: '1px solid #000', padding: '1mm 2mm', textAlign: 'right' }}>{fmt(item.price)}</td>
              <td style={{ border: '1px solid #000', padding: '1mm 2mm', textAlign: 'right', fontWeight: 'bold' }}>{fmt(item.total)}</td>
            </tr>
          ))}
          {Array.from({ length: blankCount }).map((_, i) => (
            <tr key={`b${i}`}>
              {[0,1,2,3,4,5].map(j => <td key={j} style={{ border: '1px solid #000', height: '5mm' }}></td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <hr style={{ borderTop: '1px solid #000', marginBottom: '1mm' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '42% 58%', gap: '3mm', fontSize: '9.5pt' }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #000' }}>
            <div style={{ padding: '1mm 2mm' }}>Pengirim:</div>
            <div style={{ padding: '1mm 2mm', borderLeft: '1px solid #000' }}></div>
          </div>
          <div style={{ border: '1px solid #000', borderTop: 'none' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #000', padding: '1mm' }}>Pembayaran</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #000' }}>
              <div style={{ padding: '1mm 2mm' }}>A/n:</div>
              <div style={{ padding: '1mm 2mm', borderLeft: '1px solid #000' }}>{STORE_INFO.bankAN}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ padding: '1mm 2mm' }}>Giro / Transfer: {STORE_INFO.bank}</div>
              <div style={{ padding: '1mm 2mm', borderLeft: '1px solid #000' }}>{STORE_INFO.bankAcc}</div>
            </div>
          </div>
        </div>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '1mm' }}>
            <div style={{ border: '1px solid #000', padding: '1.5mm 3mm', fontWeight: 'bold', textAlign: 'center' }}>TOTAL</div>
            <div style={{ border: '1px solid #000', borderLeft: 'none', padding: '1.5mm 3mm', textAlign: 'right', fontWeight: 'bold' }}>{fmt(inv.total)}</div>
          </div>
          {inv.note && <p style={{ fontSize: '11pt', color: '#444', marginBottom: '1mm' }}>Catatan: {inv.note}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', textAlign: 'center', marginTop: '2mm' }}>
            <div>Tanda Terima<div style={{ borderTop: '1px solid #000', marginTop: '13mm', paddingTop: '1mm' }}>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div></div>
            <div>Hormat Kami,<div style={{ borderTop: '1px solid #000', marginTop: '13mm', paddingTop: '1mm' }}>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PRINT SELECTOR
// ─────────────────────────────────────────────────────────────
function PrintSelector({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm shadow-lg">
        <p className="font-medium text-base mb-1">Pilih Metode Cetak</p>
        <p className="text-xs text-gray-500 mb-5">Pilih sesuai printer yang digunakan</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => { openPrintPopup(buildInvoiceHTML(inv)); onClose() }}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition text-left">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
              <Monitor size={20} className="text-brand-600"/>
            </div>
            <div>
              <p className="font-medium text-sm">Invoice 21×14cm</p>
              <p className="text-xs text-gray-500">Printer desktop / dot matrix</p>
            </div>
          </button>
          <button onClick={() => { openPrintPopup(buildThermalHTML(inv, '58mm')); onClose() }}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition text-left">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-green-600"/>
            </div>
            <div>
              <p className="font-medium text-sm">Struk Thermal 58mm</p>
              <p className="text-xs text-gray-500">Bluetooth printer di HP</p>
            </div>
          </button>
          <button onClick={() => { openPrintPopup(buildThermalHTML(inv, '80mm')); onClose() }}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition text-left">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-amber-600"/>
            </div>
            <div>
              <p className="font-medium text-sm">Struk Thermal 80mm</p>
              <p className="text-xs text-gray-500">Bluetooth printer 80mm di HP</p>
            </div>
          </button>
        </div>
        <button onClick={onClose} className="btn-outline w-full mt-3">Batal</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
function InvoicesContent() {
  const { invoices, updateInvoiceStatus, deleteInvoice } = useStore()
  const role          = useRole()
  const searchParams  = useSearchParams()
  const defaultCustId = searchParams.get('custId') ?? undefined

  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState('')
  const [showCreate, setCreate]       = useState(!!defaultCustId)
  const [viewing, setViewing]         = useState<Invoice | null>(null)
  const [printTarget, setPrintTarget] = useState<Invoice | null>(null)
  const [editTarget, setEditTarget]   = useState<Invoice | null>(null)

  const filtered = invoices.filter(inv =>
    (!search || inv.id.toLowerCase().includes(search.toLowerCase()) ||
     inv.custName.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || inv.status === statusFilter)
  )

  const lunas   = invoices.filter(i => i.status === 'Lunas').reduce((s, i) => s + i.total, 0)
  const piutang = invoices.filter(i => i.status === 'Belum Lunas').reduce((s, i) => s + i.total, 0)

  return (
    <div className="flex min-h-screen pt-14 pb-16 md:pt-0 md:pb-0">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold">Invoice</h1>
          <button onClick={() => setCreate(true)} className="btn-blue">+ Buat Invoice</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Total Invoice',       value: invoices.length + ' invoice', cls: 'text-gray-900'  },
            { label: 'Sudah Lunas',         value: fmt(lunas),                   cls: 'text-green-700' },
            { label: 'Piutang Belum Lunas', value: fmt(piutang),                 cls: 'text-red-600'   },
          ].map(({ label, value, cls }) => (
            <div key={label} className="card py-3">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-lg font-semibold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <input className="input flex-1" placeholder="Cari no. invoice atau pelanggan..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input w-44" value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">Semua Status</option>
            <option>Belum Lunas</option>
            <option>Lunas</option>
          </select>
        </div>

        {/* Table */}
        <table className="data-table">
          <thead><tr>
            <th>No. Invoice</th><th>Pelanggan</th>
            <th>Tanggal</th><th>Jatuh Tempo</th>
            <th>Total</th><th>Status</th><th>Aksi</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Belum ada invoice</td></tr>
            )}
            {filtered.map(inv => (
              <tr key={inv.id}>
                <td className="font-medium text-xs">{inv.id}</td>
                <td>
                  {inv.custName}
                  {inv.custId === 'UMUM' && <span className="badge badge-gray ml-1 text-[10px]">Umum</span>}
                </td>
                <td className="text-xs text-gray-500">{fmtDate(inv.date)}</td>
                <td className="text-xs text-gray-500">{fmtDate(inv.due)}</td>
                <td className="font-medium text-brand-600">{fmt(inv.total)}</td>
                <td>
                  <span className={`badge ${inv.status === 'Lunas' ? 'badge-green' : 'badge-amber'}`}>
                    {inv.status}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => setViewing(inv)} className="btn btn-outline btn-sm">
                      <Eye size={12} /> Lihat
                    </button>
                    <button onClick={() => setEditTarget(inv)} className="btn btn-outline btn-sm text-amber-600">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => setPrintTarget(inv)} className="btn btn-outline btn-sm text-brand-600">
                      <Printer size={12} /> Print
                    </button>
                    <button onClick={() => downloadInvoice(inv)} className="btn btn-outline btn-sm text-green-600">
                      <Download size={12} /> Unduh
                    </button>
                    <button
                      onClick={() => updateInvoiceStatus(inv.id, inv.status === 'Lunas' ? 'Belum Lunas' : 'Lunas').catch(console.error)}
                      className="btn btn-outline btn-sm text-xs">
                      {inv.status === 'Lunas' ? 'Batal' : '✓ Lunas'}
                    </button>
                    {role !== 'kasir' && (
                      <button
                        onClick={() => { if (confirm(`Hapus ${inv.id}?`)) deleteInvoice(inv.id).catch(console.error) }}
                        className="btn btn-danger btn-sm">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      {/* Create modal */}
      <InvoiceFormModal
        open={showCreate}
        onClose={() => setCreate(false)}
        defaultCustId={defaultCustId}
      />

      {/* Edit modal */}
      <InvoiceFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        editInvoice={editTarget}
      />

      {/* Print selector */}
      {printTarget && (
        <PrintSelector inv={printTarget} onClose={() => setPrintTarget(null)}/>
      )}

      {/* View modal */}
      {viewing && (
        <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Preview — ${viewing.id}`} size="xl">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-gray-500">
              Preview ini mendekati layout cetakan.
            </p>
            <div className="flex gap-2">
              <button onClick={() => { setEditTarget(viewing); setViewing(null) }} className="btn-outline">
                <Pencil size={14}/> Edit
              </button>
              <button onClick={() => downloadInvoice(viewing)} className="btn-outline">
                <Download size={14} /> Unduh
              </button>
              <button onClick={() => setPrintTarget(viewing)} className="btn-blue">
                <Printer size={14} /> Cetak Invoice
              </button>
            </div>
          </div>
          <InvoicePreview inv={viewing} />
        </Modal>
      )}
    </div>
  )
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen pt-14 pb-16 md:pt-0 md:pb-0">
        <Sidebar />
        <main className="flex-1 p-6 text-gray-400">Memuat...</main>
      </div>
    }>
      <InvoicesContent />
    </Suspense>
  )
}
