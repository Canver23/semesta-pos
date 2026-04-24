'use client'
import { useState, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import { useStore } from '@/lib/store'
import { fmt } from '@/lib/utils'
import { Upload, Download, CheckCircle, AlertCircle, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
interface ParsedProduct {
  name: string
  category: string
  size: string
  unit: string
  price: number    // harga umum
  stock: number
}

interface ParsedCustomerPrice {
  custName: string   // nama kolom = nama pelanggan
  itemName: string
  price: number
}

interface ParseResult {
  products: ParsedProduct[]
  customerPrices: ParsedCustomerPrice[]
  customerNames: string[]   // daftar nama kolom pelanggan yang ditemukan
  errors: string[]
}

// ─── Download template sesuai format user ────────────────────
function downloadTemplate() {
  // Format: Nama Barang | Harga Umum | Harga Gro | Harga Pitra | dst
  // Nama kolom pelanggan bebas — sistem auto-detect
  const rows = [
    ['Nama Barang', 'Harga Umum', 'Harga Gro', 'Harga Pitra', 'Harga Bani', 'Harga Apep'],
    ['AA KARET HIJAU', '36500', '', '', '', ''],
    ['AA PINUS',       '34000', '33000', '34000', '34000', ''],
    ['BESTFRESH 20',   '78000', '76000', '76000', '', ''],
    ['BESTFRESH 25',   '95000', '92000', '92000', '', ''],
    ['BUBBLE WRAP',    '125000', '', '', '', '130000'],
    ['CUP 18 OVAL',   '18000', '16000', '', '', ''],
  ]
  const content = rows.map(r =>
    r.map(c => (c.includes(',') ? `"${c}"` : c)).join(',')
  ).join('\r\n')
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url
  a.download = 'template_import_semesta.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── Parse CSV rows ───────────────────────────────────────────
function parseCSVRows(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  return lines.map(line => {
    const cells: string[] = []; let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { cells.push(cur.trim().replace(/^"|"$/g,'')); cur = '' }
      else cur += ch
    }
    cells.push(cur.trim().replace(/^"|"$/g,''))
    return cells
  })
}

// ─── Detect if a column header is a "customer price" column ──
// Semua kolom SELAIN "Nama Barang", "Kategori", "Ukuran", "Satuan", "Stok",
// dan "Harga Umum" dianggap sebagai harga khusus pelanggan.
const GENERAL_COLS = new Set([
  'nama barang', 'nama_barang', 'nama', 'item', 'barang',
  'kategori', 'category', 'cat',
  'ukuran', 'size',
  'satuan', 'unit',
  'stok', 'stock', 'qty',
  'harga umum', 'harga_umum', 'harga', 'price', 'harga umum (rp)',
])

function isCustomerPriceCol(header: string): boolean {
  const h = header.toLowerCase().trim()
  return !GENERAL_COLS.has(h) && (h.startsWith('harga') || h.includes('price') || h.includes('hrg'))
}

// ─── Main parse function ──────────────────────────────────────
function parsePriceSheet(rows: string[][]): ParseResult {
  const errors: string[] = []
  if (rows.length < 2) return { products: [], customerPrices: [], customerNames: [], errors: ['File kosong'] }

  const headers = rows[0].map(h => h.trim())
  const hLower  = headers.map(h => h.toLowerCase().trim())

  // Find column indices
  const nameIdx   = hLower.findIndex(h => ['nama barang','nama_barang','nama','item','barang'].includes(h))
  const catIdx    = hLower.findIndex(h => ['kategori','category','cat'].includes(h))
  const sizeIdx   = hLower.findIndex(h => ['ukuran','size'].includes(h))
  const unitIdx   = hLower.findIndex(h => ['satuan','unit'].includes(h))
  const stockIdx  = hLower.findIndex(h => ['stok','stock'].includes(h))
  const priceIdx  = hLower.findIndex(h => ['harga umum','harga_umum','harga','price','harga umum (rp)'].includes(h))

  if (nameIdx < 0) {
    errors.push('Kolom "Nama Barang" tidak ditemukan. Pastikan header baris pertama ada kolom nama barang.')
    return { products: [], customerPrices: [], customerNames: [], errors }
  }

  // Detect customer price columns — all "Harga X" columns except Harga Umum
  const custCols: { idx: number; name: string }[] = []
  headers.forEach((h, i) => {
    if (isCustomerPriceCol(h)) {
      // Extract customer name from column header
      // "Harga Gro" → "Gro", "Harga Pitra" → "Pitra", "Harga Bani" → "Bani"
      const custName = h
        .replace(/^harga\s*/i, '')
        .replace(/^hrg\s*/i, '')
        .trim() || h
      custCols.push({ idx: i, name: custName })
    }
  })

  const products: ParsedProduct[]      = []
  const customerPrices: ParsedCustomerPrice[] = []

  rows.slice(1).forEach((row, rowIdx) => {
    const name = row[nameIdx]?.trim()
    if (!name) return // skip empty rows

    const rawPrice = priceIdx >= 0 ? row[priceIdx]?.trim() : ''
    const price    = parseFloat(rawPrice?.replace(/[^\d.]/g, '') || '0') || 0
    const stock    = stockIdx >= 0 ? parseInt(row[stockIdx]?.replace(/[^\d]/g, '') || '0') : 0
    const cat      = catIdx >= 0 ? (row[catIdx]?.trim() || 'Lainnya') : 'Lainnya'
    const size     = sizeIdx >= 0 ? (row[sizeIdx]?.trim() || '') : ''
    const unit     = unitIdx >= 0 ? (row[unitIdx]?.trim() || 'Pcs') : 'Pcs'

    // Add product (only if has harga umum or it's a named item)
    products.push({ name, category: cat, size, unit, price, stock })

    // Add customer-specific prices
    custCols.forEach(({ idx, name: custName }) => {
      const raw   = row[idx]?.trim()
      const cPrice = parseFloat(raw?.replace(/[^\d.]/g, '') || '0') || 0
      if (cPrice > 0) {
        customerPrices.push({ custName, itemName: name, price: cPrice })
      }
    })
  })

  const customerNames = custCols.map(c => c.name)
  return { products, customerPrices, customerNames, errors }
}

// ─── Main page ────────────────────────────────────────────────
type Status = 'idle' | 'preview' | 'done'

export default function ImportPage() {
  const { addProduct, updateProduct, products: existingProds,
          addCustomer, updateCustomer, customers, allCategories } = useStore()
  const categories = allCategories()

  const [status, setStatus]         = useState<Status>('idle')
  const [parsed, setParsed]         = useState<ParseResult | null>(null)
  const [importResult, setResult]   = useState({ products: 0, customers: 0, updated: 0, warnings: [] as string[] })
  const [updateMode, setUpdateMode] = useState<'skip' | 'update'>('update')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const rows = parseCSVRows(text)
      const result = parsePriceSheet(rows)
      setParsed(result)
      setStatus('preview')
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  async function doImport() {
    if (!parsed) return
    const warnings: string[] = []
    let prodCount = 0, custCount = 0, updCount = 0

    // ── Import / update products (for...of, bukan forEach, supaya await bisa dipakai)
    for (const p of parsed.products) {
      const cat = categories.includes(p.category) ? p.category : 'Lainnya'
      const existing = existingProds.find(ep =>
        ep.name.toLowerCase() === p.name.toLowerCase()
      )
      if (existing) {
        if (updateMode === 'update') {
          const updates: Record<string, unknown> = {}
          if (p.price > 0 && p.price !== existing.price) updates.price = p.price
          if (p.stock > 0 && p.stock !== existing.stock) updates.stock = p.stock
          if (Object.keys(updates).length > 0) {
            await updateProduct(existing.id, updates)
            updCount++
          }
        } else {
          warnings.push(`"${p.name}" sudah ada — dilewati`)
        }
      } else {
        if (p.name.trim()) {
          await addProduct({ ...p, category: cat, bestseller: false })
          prodCount++
        }
      }
    }

    // ── Group customer prices by customer name ────────────
    const custMap = new Map<string, { itemName: string; price: number }[]>()
    for (const row of parsed.customerPrices) {
      if (!custMap.has(row.custName)) custMap.set(row.custName, [])
      custMap.get(row.custName)!.push({ itemName: row.itemName, price: row.price })
    }

    for (const [custName, items] of custMap.entries()) {
      const prices = items.map(r => ({
        prodId: null as null,
        name: r.itemName,
        size: '',
        unit: 'Pcs',
        price: r.price,
      }))

      const existing = customers.find(c => c.name.toLowerCase() === custName.toLowerCase())
      if (existing) {
        const existingMap = new Map(existing.prices.map(p => [p.name.toLowerCase(), p]))
        let changed = false
        const merged = [...existing.prices]

        for (const p of prices) {
          const key = p.name.toLowerCase()
          const exP = existingMap.get(key)
          if (exP) {
            if (updateMode === 'update' && exP.price !== p.price) {
              const idx = merged.findIndex(x => x.name.toLowerCase() === key)
              if (idx >= 0) { merged[idx] = { ...merged[idx], price: p.price }; changed = true }
            }
          } else {
            merged.push(p); changed = true
          }
        }

        if (changed) {
          await updateCustomer(existing.id, { prices: merged })
          warnings.push(`"${custName}" diperbarui — harga khusus disinkronkan`)
          updCount++
        }
      } else {
        await addCustomer({ name: custName, phone: '', email: '', address: '', prices })
        custCount++
      }
    }

    setResult({ products: prodCount, customers: custCount, updated: updCount, warnings })
    setStatus('done')
  }

  function reset() {
    setStatus('idle'); setParsed(null)
    setResult({ products: 0, customers: 0, updated: 0, warnings: [] })
  }

  // Summary counts for preview
  const uniqueCustomers = parsed
    ? new Set(parsed.customerPrices.map(r => r.custName)).size
    : 0

  return (
    <div className="flex min-h-screen pt-14 pb-16 md:pt-0 md:pb-0">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Import Data dari Excel</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Format: Nama Barang | Harga Umum | Harga [NamaPelanggan1] | Harga [NamaPelanggan2] | ...
          </p>
        </div>

        {/* ── IDLE ── */}
        {status === 'idle' && (
          <div className="max-w-2xl flex flex-col gap-5">

            {/* Format visual */}
            <div className="card border-brand-200 bg-brand-50">
              <p className="text-sm font-medium text-brand-800 mb-3">
                Format Excel yang didukung — persis seperti file kamu
              </p>
              <div className="overflow-x-auto mb-3">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr className="bg-brand-200">
                      {['Nama Barang','Harga Umum','Harga Gro','Harga Pitra','Harga Bani','Harga Apep'].map(h => (
                        <th key={h} className="border border-brand-300 px-2 py-1.5 text-brand-900 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['AA PINUS',      '34000','33000','34000','34000',''],
                      ['BESTFRESH 20',  '78000','76000','76000','',''],
                      ['BESTFRESH 25',  '95000','92000','92000','',''],
                      ['BUBBLE WRAP',   '125000','','','','130000'],
                    ].map((r,i) => (
                      <tr key={i} className={i%2===0?'bg-white':'bg-brand-50/50'}>
                        {r.map((c,j) => (
                          <td key={j} className="border border-brand-200 px-2 py-1 whitespace-nowrap">
                            {c || <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-brand-700">
                <div className="bg-white rounded-lg p-2.5 border border-brand-200">
                  <p className="font-medium mb-1">✅ Yang terdeteksi otomatis:</p>
                  <ul className="space-y-0.5 text-brand-600">
                    <li>• Kolom "Harga Umum" → harga produk</li>
                    <li>• Kolom "Harga Gro" → pelanggan "Gro"</li>
                    <li>• Kolom "Harga Pitra" → pelanggan "Pitra"</li>
                    <li>• dst — nama kolom = nama pelanggan</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-brand-200">
                  <p className="font-medium mb-1">💡 Tips:</p>
                  <ul className="space-y-0.5 text-brand-600">
                    <li>• Sel kosong = tidak punya harga khusus</li>
                    <li>• Baris kosong dilewati otomatis</li>
                    <li>• Nama kolom boleh "Harga X" atau "Hrg X"</li>
                    <li>• Header harus ada di baris pertama</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-3">
              <div className="card flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-400 text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Siapkan file Excel kamu</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Buka Excel → pastikan baris pertama adalah header (Nama Barang, Harga Umum, Harga Gro, dst)
                    → <strong>File → Save As → CSV UTF-8</strong>
                  </p>
                  <button onClick={downloadTemplate} className="btn-outline text-sm">
                    <Download size={13}/> Download Template CSV
                  </button>
                </div>
              </div>

              <div className="card flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-400 text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Upload file CSV</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Sistem akan auto-detect kolom harga pelanggan dari nama header kolom.
                  </p>

                  {/* Update mode */}
                  <div className="flex gap-2 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input type="radio" name="mode" checked={updateMode==='update'} onChange={() => setUpdateMode('update')} className="w-3.5 h-3.5"/>
                      <div>
                        <span className="font-medium">Update harga</span>
                        <span className="text-gray-500 ml-1">— produk/pelanggan yg sudah ada akan diperbarui harganya</span>
                      </div>
                    </label>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input type="radio" name="mode" checked={updateMode==='skip'} onChange={() => setUpdateMode('skip')} className="w-3.5 h-3.5"/>
                      <div>
                        <span className="font-medium">Skip yang sudah ada</span>
                        <span className="text-gray-500 ml-1">— hanya tambah data baru saja</span>
                      </div>
                    </label>
                  </div>

                  <button onClick={() => fileRef.current?.click()} className="btn-blue">
                    <Upload size={13}/> Pilih File CSV
                  </button>
                  <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile}/>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {status === 'preview' && parsed && (
          <div className="max-w-5xl flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-base">Hasil Parsing — Siap Diimport</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="text-brand-600 font-medium">{parsed.products.length} produk</span>
                  {parsed.customerNames.length > 0 && (
                    <> · <span className="text-green-600 font-medium">{uniqueCustomers} pelanggan</span>
                    {' '}({parsed.customerNames.join(', ')})</>
                  )}
                  {parsed.errors.length > 0 && (
                    <span className="text-amber-600 ml-2">· {parsed.errors.length} peringatan</span>
                  )}
                </p>
              </div>
              <button onClick={reset} className="btn-ghost"><X size={14}/> Batal</button>
            </div>

            {/* Detected customer columns */}
            {parsed.customerNames.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-medium text-green-800 mb-2">
                  ✅ Kolom pelanggan terdeteksi ({parsed.customerNames.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {parsed.customerNames.map(n => (
                    <span key={n} className="badge badge-green text-sm px-3 py-1">{n}</span>
                  ))}
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Setiap pelanggan akan dibuat/diperbarui dengan harga khusus dari kolom masing-masing.
                </p>
              </div>
            )}

            {parsed.errors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-medium text-amber-700 mb-1">⚠ Peringatan:</p>
                {parsed.errors.map((e,i) => <p key={i} className="text-xs text-amber-700">• {e}</p>)}
              </div>
            )}

            {/* Products preview */}
            <div>
              <p className="text-sm font-medium mb-2">Preview Produk (10 pertama dari {parsed.products.length})</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 border-b border-gray-200">Nama Barang</th>
                      <th className="px-3 py-2 text-right text-gray-500 border-b border-gray-200">Harga Umum</th>
                      {parsed.customerNames.slice(0,4).map(n => (
                        <th key={n} className="px-3 py-2 text-right text-gray-500 border-b border-gray-200">
                          {n}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.products.slice(0,10).map((p,i) => {
                      const custPrices = parsed.customerPrices.filter(cp => cp.itemName === p.name)
                      return (
                        <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-1.5 font-medium">{p.name}</td>
                          <td className="px-3 py-1.5 text-right text-brand-600">
                            {p.price > 0 ? fmt(p.price) : <span className="text-gray-300">—</span>}
                          </td>
                          {parsed.customerNames.slice(0,4).map(n => {
                            const cp = custPrices.find(c => c.custName === n)
                            return (
                              <td key={n} className="px-3 py-1.5 text-right text-green-700">
                                {cp ? fmt(cp.price) : <span className="text-gray-300">—</span>}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                    {parsed.products.length > 10 && (
                      <tr><td colSpan={6} className="text-center py-2 text-xs text-gray-400 italic">
                        +{parsed.products.length-10} produk lagi
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={reset} className="btn-outline">Batal, Upload Ulang</button>
              <button
                onClick={doImport}
                disabled={parsed.products.length === 0}
                className="btn-blue"
              >
                <Upload size={14}/> Import {parsed.products.length} Produk
                {uniqueCustomers > 0 && ` + ${uniqueCustomers} Pelanggan`}
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {status === 'done' && (
          <div className="max-w-lg flex flex-col gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle size={22} className="text-green-600"/>
                <p className="font-medium text-green-800 text-base">Import Selesai!</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Produk baru',    value: importResult.products  },
                  { label: 'Pelanggan baru', value: importResult.customers },
                  { label: 'Data diperbarui',value: importResult.updated   },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-lg p-3 text-center border border-green-200">
                    <p className="text-2xl font-semibold text-green-700">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {importResult.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
                  <AlertCircle size={13}/> Catatan ({importResult.warnings.length}):
                </p>
                {importResult.warnings.map((w,i) => <p key={i} className="text-xs text-amber-700">• {w}</p>)}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={reset} className="btn-outline">Import File Lain</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
