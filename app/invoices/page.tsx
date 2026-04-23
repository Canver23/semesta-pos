'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Modal from '@/components/ui/Modal'
import { useStore } from '@/lib/store'
import { fmt, fmtDate, todayISO, UNITS, STORE_INFO } from '@/lib/utils'
import type { Invoice, InvoiceItem } from '@/lib/types'
import { Printer, Plus, X, Trash2, Eye } from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// BUILD INVOICE HTML — layout persis seperti Excel VBA kamu
// Kertas: 21cm × 14cm (custom "Invoice"), landscape
// ─────────────────────────────────────────────────────────────
function buildInvoiceHTML(inv: Invoice): string {
  // Total baris tabel item — selalu 14 baris (sesuai Excel row 9-22)
  const TOTAL_ROWS = 14
  const itemRows = inv.items.map(item => `
    <tr>
      <td class="td-left">${item.name}</td>
      <td class="td-center">${item.size || ''}</td>
      <td class="td-center">${item.qty}</td>
      <td class="td-center">${item.unit}</td>
      <td class="td-right">${fmt(item.price)}</td>
      <td class="td-right">${fmt(item.total)}</td>
    </tr>`).join('')

  const blankCount = Math.max(0, TOTAL_ROWS - inv.items.length)
  const blankRows  = Array.from({ length: blankCount })
    .map(() => `<tr><td class="td-blank"></td><td class="td-blank"></td><td class="td-blank"></td><td class="td-blank"></td><td class="td-blank"></td><td class="td-blank"></td></tr>`)
    .join('')

  // No invoice + nama kasir (pojok kanan atas seperti Excel)
  const kasirName  = 'ADMIN'
  const noInvoice  = inv.id
  const tglDisplay = fmtDate(inv.date)
  const custDisplay = inv.custName || 'Pembeli Umum'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${noInvoice}</title>
  <style>
    /* ── Ukuran kertas custom Invoice: 21cm × 14cm ── */
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

    /* ── INVOICE title ── */
    .inv-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 4px;
      margin-bottom: 2mm;
    }

    /* ── Top divider line ── */
    .top-line {
      border-top: 2px solid #000;
      margin-bottom: 1.5mm;
    }

    /* ── Header row: No Invoice kiri, Kepada Yth kanan ── */
    .header-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 1.5mm;
      font-size: 9.5pt;
    }
    .header-right {
      text-align: right;
    }

    /* ── Items table ── */
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
      background: #fff;
    }
    .items-table td {
      border: 1px solid #000;
      padding: 1mm 2mm;
      height: 5.2mm;
    }
    .td-left   { text-align: left; }
    .td-center { text-align: center; }
    .td-right  { text-align: right; }
    .td-blank  { border: 1px solid #000; height: 5.2mm; }

    /* Kolom widths (approximate Excel ratios) */
    .col-nama    { width: 35%; }
    .col-ukuran  { width: 13%; }
    .col-qty     { width: 8%;  }
    .col-satuan  { width: 12%; }
    .col-harga   { width: 16%; }
    .col-total   { width: 16%; }

    /* ── Bottom divider ── */
    .bottom-line {
      border-top: 1px solid #000;
      margin: 1mm 0;
    }

    /* ── Footer area ── */
    .footer {
      display: grid;
      grid-template-columns: 42% 58%;
      gap: 3mm;
      font-size: 11pt;
    }

    /* Kiri bawah: Pengirim + Pembayaran */
    .footer-left {}
    .pengirim-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid #000;
      margin-bottom: 0;
    }
    .pengirim-label { padding: 1mm 2mm; }
    .pengirim-val   { padding: 1mm 2mm; border-left: 1px solid #000; }
    .pembayaran-box {
      border: 1px solid #000;
      border-top: none;
    }
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

    /* Kanan bawah: Total + Tanda tangan */
    .footer-right {}
    .total-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 1mm;
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
    .note-text {
      font-size: 8.5pt;
      color: #444;
      margin-bottom: 1mm;
      min-height: 3mm;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      font-size: 11pt;
      margin-top: 1mm;
    }
    .sig-box {
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #000;
      margin-top: 13mm;
      padding-top: 1mm;
    }
  </style>
</head>
<body>

  <!-- Title -->
  <div class="inv-title">I N V O I C E</div>
  <div class="top-line"></div>

  <!-- Header: No Invoice + Kepada Yth -->
  <div class="header-row">
    <div>
      No Invoice: &nbsp;<strong>${noInvoice}</strong>
    </div>
    <div class="header-right">
      Kepada Yth, &nbsp;<strong>${custDisplay}</strong> &nbsp;&nbsp;&nbsp;&nbsp; <strong>${kasirName}</strong>
      <br>
      Tanggal &nbsp;<strong>${tglDisplay}</strong>
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <colgroup>
      <col class="col-nama">
      <col class="col-ukuran">
      <col class="col-qty">
      <col class="col-satuan">
      <col class="col-harga">
      <col class="col-total">
    </colgroup>
    <thead>
      <tr>
        <th>Nama Barang</th>
        <th>Ukuran</th>
        <th>Qty</th>
        <th>Satuan</th>
        <th>Harga Satuan</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${blankRows}
    </tbody>
  </table>

  <div class="bottom-line"></div>

  <!-- Footer -->
  <div class="footer">

    <!-- Kiri: Pengirim + Pembayaran -->
    <div class="footer-left">
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

    <!-- Kanan: Total + Tanda Terima + Hormat Kami -->
    <div class="footer-right">
      <div class="total-section">
        <div class="total-box-label">TOTAL</div>
        <div class="total-box-val">${fmt(inv.total)}</div>
      </div>
      ${inv.note ? `<div class="note-text">Catatan: ${inv.note}</div>` : '<div class="note-text"></div>'}
      <div class="signatures">
        <div class="sig-box">
          Tanda Terima
          <div class="sig-line">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
        </div>
        <div class="sig-box">
          Hormat Kami,
          <div class="sig-line">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
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

// ─────────────────────────────────────────────────────────────
// PRINT POPUP — buka window baru, langsung print
// Bekerja untuk SEMUA invoice (pelanggan & umum)
// ─────────────────────────────────────────────────────────────
function printInvoicePopup(inv: Invoice) {
  const w = window.open('', '_blank', 'width=900,height=650')
  if (!w) {
    alert('Pop-up diblokir browser.\nIzinkan pop-up: klik ikon kunci/info di address bar → izinkan pop-up untuk localhost.')
    return
  }
  w.document.open()
  w.document.write(buildInvoiceHTML(inv))
  w.document.close()
}

// ─────────────────────────────────────────────────────────────
// CREATE INVOICE MODAL
// ─────────────────────────────────────────────────────────────
function CreateInvoiceModal({ open, onClose, defaultCustId }:
  { open: boolean; onClose: () => void; defaultCustId?: string }) {
  const { customers, products, addInvoice } = useStore()
  const [isUmum, setIsUmum]     = useState(false)
  const [custId, setCustId]     = useState(defaultCustId ?? '')
  const [namaUmum, setNamaUmum] = useState('')
  const [date, setDate]         = useState(todayISO())
  const [due, setDue]           = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10)
  })
  const [note, setNote]   = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([])

  useEffect(() => {
    if (defaultCustId) { setCustId(defaultCustId); setIsUmum(false) }
  }, [defaultCustId])

  const cust     = customers.find(c => c.id === custId)
  const subtotal = items.reduce((s, i) => s + i.total, 0)
  // custName: pelanggan terdaftar pakai nama dari DB, umum pakai input atau default
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
    // Validasi: umum = nama boleh kosong (default "Pembeli Umum"), pelanggan harus pilih
    if (!isUmum && !custId) return
    if (!items.length) return
    await addInvoice({
      custId: isUmum ? 'UMUM' : custId,
      custName,
      date, due, items, total: subtotal,
      status: 'Belum Lunas', note,
    })
    onClose()
    setItems([]); setCustId(''); setNamaUmum(''); setNote('')
  }

  const canSave = items.length > 0 && (isUmum || !!custId)

  return (
    <Modal open={open} onClose={onClose} title="Buat Invoice" size="xl">
      <div className="flex flex-col gap-4">

        {/* Toggle Pelanggan / Umum */}
        <div className="flex gap-0 p-1 bg-gray-100 rounded-lg">
          {[
            { label: '👤 Pelanggan Terdaftar', val: false },
            { label: '🛒 Pembeli Umum / Eceran', val: true },
          ].map(({ label, val }) => (
            <button key={label} onClick={() => setIsUmum(val)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                isUmum === val
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
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
              <input
                className="input"
                value={namaUmum}
                onChange={e => setNamaUmum(e.target.value)}
                placeholder="Pembeli Umum"
              />
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

        {/* Hint harga khusus */}
        {!isUmum && cust && cust.prices.length > 0 && (
          <div className="bg-brand-50 rounded-lg px-3 py-2 text-xs text-brand-800">
            ★ {cust.name} punya {cust.prices.length} produk harga khusus — ada di dropdown bawah.
          </div>
        )}

        {/* Quick add */}
        <div className="flex gap-2">
          <select
            className="input flex-1 text-sm"
            onChange={e => { addFromCatalog(e.target.value); e.currentTarget.value = '' }}
            defaultValue=""
          >
            <option value="">+ Tambah item dari katalog...</option>
            {!isUmum && cust && cust.prices.length > 0 && (
              <optgroup label={`★ Harga Khusus ${cust.name}`}>
                {cust.prices.map((p, i) => (
                  <option key={`cust-${i}`} value={`cust-${i}`}>
                    {p.name} ({p.size || '-'}) — {fmt(p.price)} ★
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Katalog Umum">
              {products.map(p => (
                <option key={`prod-${p.id}`} value={`prod-${p.id}`}>
                  {p.name} ({p.size || '-'}) — {fmt(p.price)}
                </option>
              ))}
            </optgroup>
          </select>
          <button
            onClick={() => setItems(prev => [...prev, { name: '', size: '', qty: 1, unit: 'Pcs', price: 0, total: 0 }])}
            className="btn-outline whitespace-nowrap"
          >
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
                    <input className="input text-xs py-1 text-center" type="number" value={item.qty}
                      onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 1)} />
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
          <button onClick={save} disabled={!canSave} className="btn-blue flex-[2]">
            Simpan Invoice
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// INVOICE PREVIEW DALAM MODAL (tampilan desktop)
// ─────────────────────────────────────────────────────────────
function InvoicePreview({ inv }: { inv: Invoice }) {
  const TOTAL_ROWS = 14
  const blankCount = Math.max(0, TOTAL_ROWS - inv.items.length)

  return (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: '11pt', background: 'white', padding: '4mm', border: '1px solid #ccc' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', letterSpacing: '4px', marginBottom: '3mm' }}>
        I N V O I C E
      </div>
      <hr style={{ borderTop: '2px solid #000', marginBottom: '2mm' }} />

      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '2mm', fontSize: '10pt' }}>
        <div>No Invoice: <strong>{inv.id}</strong></div>
        <div style={{ textAlign: 'right' }}>
          Kepada Yth, <strong>{inv.custName || 'Pembeli Umum'}</strong> &nbsp;&nbsp; <strong>ADMIN</strong>
          <br />Tanggal <strong>{fmtDate(inv.date)}</strong>
        </div>
      </div>

      {/* Table */}
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

      {/* Footer */}
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
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
function InvoicesContent() {
  const { invoices, updateInvoiceStatus, deleteInvoice } = useStore()
  const searchParams  = useSearchParams()
  const defaultCustId = searchParams.get('custId') ?? undefined

  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [showCreate, setCreate]   = useState(!!defaultCustId)
  const [viewing, setViewing]     = useState<Invoice | null>(null)

  const filtered = invoices.filter(inv =>
    (!search || inv.id.toLowerCase().includes(search.toLowerCase()) ||
     inv.custName.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || inv.status === statusFilter)
  )

  const lunas   = invoices.filter(i => i.status === 'Lunas').reduce((s, i) => s + i.total, 0)
  const piutang = invoices.filter(i => i.status === 'Belum Lunas').reduce((s, i) => s + i.total, 0)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold">Invoice</h1>
          <button onClick={() => setCreate(true)} className="btn-blue">+ Buat Invoice</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Total Invoice',      value: invoices.length + ' invoice', cls: 'text-gray-900'  },
            { label: 'Sudah Lunas',        value: fmt(lunas),                   cls: 'text-green-700' },
            { label: 'Piutang Belum Lunas',value: fmt(piutang),                 cls: 'text-red-600'   },
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
                    <button onClick={() => printInvoicePopup(inv)} className="btn btn-outline btn-sm text-brand-600">
                      <Printer size={12} /> Print
                    </button>
                    <button
                      onClick={() => updateInvoiceStatus(inv.id, inv.status === 'Lunas' ? 'Belum Lunas' : 'Lunas').catch(console.error)}
                      className="btn btn-outline btn-sm text-xs"
                    >
                      {inv.status === 'Lunas' ? 'Batal' : '✓ Lunas'}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Hapus ${inv.id}?`)) deleteInvoice(inv.id).catch(console.error) }}
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
      </main>

      {/* Create modal */}
      <CreateInvoiceModal
        open={showCreate}
        onClose={() => setCreate(false)}
        defaultCustId={defaultCustId}
      />

      {/* View modal */}
      {viewing && (
        <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Preview — ${viewing.id}`} size="xl">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-gray-500">
              Preview ini mendekati layout cetakan. Klik Print untuk hasil yang tepat di kertas Invoice 21×14cm.
            </p>
            <button onClick={() => printInvoicePopup(viewing)} className="btn-blue">
              <Printer size={14} /> Cetak Invoice
            </button>
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
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 text-gray-400">Memuat...</main>
      </div>
    }>
      <InvoicesContent />
    </Suspense>
  )
}
