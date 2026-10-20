'use client'
import { useState, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import { useStore } from '@/lib/store'
import { fmt } from '@/lib/utils'
import { Download, TrendingUp, ShoppingBag, FileText, AlertCircle } from 'lucide-react'

// ─── Real XLSX export via SheetJS (loaded from CDN at runtime) ─
async function exportXLSX(
  filename: string,
  sheets: { name: string; rows: (string | number)[][] }[]
) {
  // Dynamically import xlsx — avoids SSR issues
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Auto column widths
    const colWidths: number[] = []
    rows.forEach(row => {
      row.forEach((cell, i) => {
        const len = String(cell ?? '').length
        colWidths[i] = Math.max(colWidths[i] ?? 10, len + 2)
      })
    })
    ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 40) }))

    // Style header row bold (xlsx community edition doesn't support cell styles,
    // but column widths + freeze pane still work great)
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }

    XLSX.utils.book_append_sheet(wb, ws, name)
  })

  XLSX.writeFile(wb, filename)
}

export default function ReportsPage() {
  const { transactions, invoices } = useStore()
  const [exporting, setExporting] = useState(false)

  // Available months
  const months = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach(t => {
      const p = t.date.split('/')
      if (p.length === 3) set.add(`${p[2]}-${p[1]}`)
    })
    invoices.forEach(i => {
      const p = i.date.split('-')
      if (p.length >= 2) set.add(`${p[0]}-${p[1]}`)
    })
    const now = new Date()
    set.add(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
    return Array.from(set).sort().reverse()
  }, [transactions, invoices])

  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? '')

  const monthTrx = useMemo(() => {
    if (!selectedMonth) return transactions
    const [y, m] = selectedMonth.split('-')
    return transactions.filter(t => {
      const p = t.date.split('/')
      return p.length === 3 && p[2] === y && p[1] === m
    })
  }, [transactions, selectedMonth])

  const monthInv = useMemo(() => {
    if (!selectedMonth) return invoices
    return invoices.filter(i => i.date.startsWith(selectedMonth))
  }, [invoices, selectedMonth])

  // Metrics
  const totalKasir   = monthTrx.reduce((s,t) => s+t.total, 0)
  const totalInvoice = monthInv.reduce((s,i) => s+i.total, 0)
  const totalLunas   = monthInv.filter(i => i.status==='Lunas').reduce((s,i) => s+i.total, 0)
  const totalPiutang = monthInv.filter(i => i.status==='Belum Lunas').reduce((s,i) => s+i.total, 0)

  // Product tally from kasir
  const productStats = useMemo(() => {
    const map = new Map<string, number>()
    monthTrx.forEach(t => {
      t.items.split(', ').forEach(item => {
        const match = item.match(/^(.+?)\s*×\s*([\d.,]+)$/)
        if (match) {
          const name = match[1].trim()
          const qty = parseFloat(match[2].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))
          map.set(name, (map.get(name) ?? 0) + (Number.isFinite(qty) ? qty : 0))
        }
      })
    })
    return Array.from(map.entries()).map(([name, qty]) => ({ name, qty })).sort((a,b) => b.qty-a.qty)
  }, [monthTrx])

  const monthLabel = selectedMonth
    ? new Date(selectedMonth+'-01').toLocaleDateString('id-ID', { month:'long', year:'numeric' })
    : 'Semua Waktu'

  async function handleExport() {
    setExporting(true)
    try {
      // Sheet 1: Transaksi Kasir
      const trxRows: (string|number)[][] = [
        ['ID Transaksi','Tanggal','Jam','Item','Total (Rp)','Cash (Rp)','Kembalian (Rp)','Metode'],
        ...monthTrx.map(t => [t.id, t.date, t.time, t.items, t.total, t.cash, t.change, t.method]),
        [], // empty row
        ['TOTAL','','','', monthTrx.reduce((s,t)=>s+t.total,0),'','',''],
      ]

      // Sheet 2: Invoice
      const invRows: (string|number)[][] = [
        ['No Invoice','Pelanggan','Tanggal','Jatuh Tempo','Total (Rp)','Status','Catatan'],
        ...monthInv.map(i => [i.id, i.custName, i.date, i.due, i.total, i.status, i.note]),
        [],
        ['TOTAL INVOICE','','','', monthInv.reduce((s,i)=>s+i.total,0),'',''],
        ['TOTAL LUNAS','','','',   totalLunas,'',''],
        ['PIUTANG','','','',       totalPiutang,'',''],
      ]

      // Summary rows at the top of sheet 1
      const summaryHeader: (string|number)[][] = [
        [`LAPORAN BULANAN — ${monthLabel.toUpperCase()}`],
        [],
        ['RINGKASAN',''],
        ['Pendapatan Kasir', totalKasir],
        ['Total Invoice',    totalInvoice],
        ['Invoice Lunas',    totalLunas],
        ['Piutang',          totalPiutang],
        ['Produk Terlaris',  productStats[0]?.name ?? '-'],
        [],
      ]

      await exportXLSX(
        `Laporan_${selectedMonth||'Semua'}_SemestaPlastik.xlsx`,
        [
          { name: 'Transaksi Kasir', rows: [...summaryHeader, ...trxRows] },
          { name: 'Invoice',         rows: invRows },
        ]
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex min-h-screen pt-14 pb-16 md:pt-0 md:pb-0">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold">Laporan Bulanan</h1>
            <p className="text-sm text-gray-500 mt-0.5">Rekap penjualan + invoice — export ke Excel (.xlsx)</p>
          </div>
          <div className="flex gap-3 items-center">
            <select className="input w-52" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              <option value="">Semua Waktu</option>
              {months.map(m => (
                <option key={m} value={m}>
                  {new Date(m+'-01').toLocaleDateString('id-ID',{month:'long',year:'numeric'})}
                </option>
              ))}
            </select>
            <button onClick={handleExport} disabled={exporting} className="btn-blue">
              <Download size={14}/>
              {exporting ? 'Menyiapkan...' : 'Export Excel (.xlsx)'}
            </button>
          </div>
        </div>

        <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-2 text-xs text-brand-800">
          <FileText size={14} className="mt-0.5 shrink-0"/>
          <span>File Excel yang dieksport berisi <strong>2 sheet</strong>: (1) Transaksi Kasir + ringkasan bulanan, (2) Daftar Invoice. Langsung bisa dibuka di Excel/Google Sheets.</span>
        </div>

        <p className="text-sm font-medium text-gray-700 mb-4">Periode: <span className="text-brand-600">{monthLabel}</span></p>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label:'Pendapatan Kasir',    value: fmt(totalKasir),   icon: ShoppingBag, cls:'text-brand-600' },
            { label:'Total Invoice',       value: fmt(totalInvoice), icon: FileText,    cls:'text-gray-900'  },
            { label:'Invoice Lunas',       value: fmt(totalLunas),   icon: TrendingUp,  cls:'text-green-600' },
            { label:'Piutang Belum Lunas', value: fmt(totalPiutang), icon: AlertCircle, cls:'text-red-600'   },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="card">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-gray-500">{label}</p>
                <Icon size={14} className={cls}/>
              </div>
              <p className={`text-xl font-semibold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Transaksi kasir */}
          <div>
            <h2 className="text-sm font-medium mb-3">
              Transaksi Kasir
              <span className="ml-2 badge badge-gray">{monthTrx.length}</span>
            </h2>
            <table className="data-table">
              <thead><tr><th style={{minWidth:"160px"}}>No. Transaksi</th><th>Tanggal</th><th>Jam</th><th>Total</th></tr></thead>
              <tbody>
                {monthTrx.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400">Tidak ada transaksi</td></tr>}
                {monthTrx.slice(0,15).map(t => (
                  <tr key={t.id}>
                    <td className="text-xs font-medium tabular-nums whitespace-nowrap">{t.id}</td>
                    <td className="text-xs">{t.date}</td>
                    <td className="text-xs text-gray-500">{t.time}</td>
                    <td className="font-medium text-brand-600 text-sm">{fmt(t.total)}</td>
                  </tr>
                ))}
                {monthTrx.length > 15 && (
                  <tr><td colSpan={4} className="text-center py-2 text-xs text-gray-400 italic">
                    +{monthTrx.length-15} lagi — export Excel untuk data lengkap
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Produk terlaris */}
          <div>
            <h2 className="text-sm font-medium mb-3">Produk Terlaris</h2>
            <table className="data-table">
              <thead><tr><th>#</th><th>Produk</th><th>Qty Terjual</th></tr></thead>
              <tbody>
                {productStats.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-gray-400">Tidak ada data</td></tr>}
                {productStats.slice(0,10).map((p,i) => (
                  <tr key={p.name}>
                    <td className="text-xs text-gray-400 w-8">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}
                    </td>
                    <td className="font-medium text-sm">{p.name}</td>
                    <td><span className="badge badge-blue">{p.qty}×</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice list */}
        <div className="mt-6">
          <h2 className="text-sm font-medium mb-3">
            Invoice
            <span className="ml-2 badge badge-gray">{monthInv.length}</span>
            {totalPiutang > 0 && <span className="ml-2 badge badge-amber">Piutang: {fmt(totalPiutang)}</span>}
          </h2>
          <table className="data-table">
            <thead><tr><th>No. Invoice</th><th>Pelanggan</th><th>Tanggal</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {monthInv.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Tidak ada invoice</td></tr>}
              {monthInv.map(i => (
                <tr key={i.id}>
                  <td className="text-xs font-medium">{i.id}</td>
                  <td>{i.custName}</td>
                  <td className="text-xs text-gray-500">{i.date}</td>
                  <td className="font-medium text-brand-600">{fmt(i.total)}</td>
                  <td><span className={`badge ${i.status==='Lunas'?'badge-green':'badge-amber'}`}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
