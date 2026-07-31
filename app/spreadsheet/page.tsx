'use client'
import { useState, useCallback, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import { Upload, Download, Loader2, X, Edit3, Plus, Trash2, LayoutDashboard, Table, TrendingUp, ShoppingBag, Banknote, Package } from 'lucide-react'

interface SheetInfo { name: string; rows: number; cols: number; headers: string[]; data: any[][] }

interface MetricData {
  totalRevenue?: number; totalOrders?: number; totalQty?: number
  revenueByDay?: { date: string; revenue: number }[]
  courierDistribution?: { name: string; count: number; color: string }[]
  topProducts?: { name: string; qty: number }[]
  platformBreakdown: { platform: string; orders: number; revenue: number }
  overall: { dealTransaksi: number; cancelTransaksi: number; totalTransaksi: number; qtyItem: number; laba: number }
  dailyTransaksi: { date: string; deal: number; cancel: number }[]
  weeklyTransaksi: { week: string; deal: number; cancel: number; total: number }[]
  weeklyLaba: { week: string; laba: number; cumulative: number; paid: string }[]
  productRanks: { name: string; deal: number; cancel: number; total: number }[]
  paymentByWeek: { week: string; codTransaksi: number; codQty: number }[]
  qtyByWeek: { week: string; qty: number }[]
}

function fmt(v: number): string { return 'Rp ' + v.toLocaleString('id-ID') }
function fmtNum(v: number): string { return v.toLocaleString('id-ID') }

const BAR_COLORS = ['#3B82F6', '#F87171', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4']
const WEEK_COLORS: Record<string, string> = { 'WEEK-1': '#3B82F6', 'WEEK-2': '#8B5CF6', 'WEEK-3': '#10B981', 'WEEK-4': '#F59E0B', 'WEEK-5': '#EF4444' }

function BarChartv({ data, xKey, yKey, color, maxVal }: { data: any[]; xKey: string; yKey: string; color?: string; maxVal?: number }) {
  const max = maxVal || Math.max(...data.map(d => d[yKey] || 0), 1)
  return (
    <div className="flex items-end gap-1.5 h-36">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
          <div className="w-full rounded-t transition-all hover:opacity-80" style={{ height: `${((d[yKey] || 0) / max) * 100}%`, backgroundColor: color || BAR_COLORS[i % BAR_COLORS.length], minHeight: d[yKey] > 0 ? 4 : 0 }} />
          <span className="text-[10px] text-gray-400 mt-1">{d[xKey]}</span>
          <div className="hidden group-hover:block absolute bottom-6 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">{d[yKey]}</div>
        </div>
      ))}
    </div>
  )
}

function GroupedBarChart({ data, xKey, keys, colors }: { data: any[]; xKey: string; keys: string[]; colors: string[] }) {
  const max = Math.max(1, ...data.flatMap(d => keys.map(k => d[k] || 0)))
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative">
          <div className="flex items-end gap-0.5 w-full h-full">
            {keys.map((k, ki) => (
              <div key={ki} className="flex-1 rounded-t transition-all hover:opacity-80" style={{ height: `${((d[k] || 0) / max) * 100}%`, backgroundColor: colors[ki % colors.length], minHeight: d[k] > 0 ? 2 : 0 }} />
            ))}
          </div>
          <span className="text-[10px] text-gray-400 mt-1">{d[xKey]}</span>
        </div>
      ))}
    </div>
  )
}

export default function SpreadsheetPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sheets, setSheets] = useState<SheetInfo[]>([])
  const [dashboard, setDashboard] = useState<MetricData | null>(null)
  const [activeTab, setActiveTab] = useState<'d1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'sheet'>('d1')
  const [activeSheet, setActiveSheet] = useState(0)
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) { setFile(f); setError('') }
  }, [])
  const handleUpload = useCallback(async () => {
    if (!file) return; setLoading(true); setError(''); setSheets([]); setDashboard(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/spreadsheet/parse', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Gagal'); return }
      setSheets(data.sheets || []); setDashboard(data.dashboard); setActiveTab('d1')
    } catch { setError('Gagal terhubung') } finally { setLoading(false) }
  }, [file])
  function handleCellClick(row: number, col: number) {
    const sh = sheets[activeSheet]; if (!sh) return
    const val = sh.data[row]?.[col]; setEditingCell({ row, col }); setEditValue(val != null ? String(val) : '')
    setTimeout(() => inputRef.current?.focus(), 50)
  }
  function handleCellSave() {
    if (!editingCell) return; const { row, col } = editingCell; const ns = [...sheets]
    if (!ns[activeSheet].data[row]) ns[activeSheet].data[row] = []
    ns[activeSheet].data[row][col] = editValue; setSheets(ns); setEditingCell(null)
  }
  function handleCellKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCellSave()
    if (e.key === 'Escape') setEditingCell(null)
  }
  function handleAddRow() { const ns = [...sheets]; ns[activeSheet].data.push(new Array(ns[activeSheet].cols).fill('')); setSheets(ns) }
  function handleDeleteRow(ri: number) { const ns = [...sheets]; ns[activeSheet].data.splice(ri, 1); setSheets(ns) }
  async function handleDownload() {
    setSaving(true)
    try {
      const res = await fetch('/api/spreadsheet/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file?.name, sheets: sheets.map(sh => ({ name: sh.name, headers: sh.headers, data: sh.data })) }) })
      if (!res.ok) throw new Error('')
      const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a')
      a.href = url; a.download = file?.name || 'spreadsheet.xlsx'; a.click(); URL.revokeObjectURL(url)
    } catch { setError('Gagal menyimpan') } finally { setSaving(false) }
  }

  const sh = sheets[activeSheet]; const d = dashboard

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-0">
        <div className="pt-14 md:pt-0 pb-16 md:pb-0 px-4 md:px-6 py-6 max-w-full">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div><h1 className="text-xl font-semibold text-gray-800">Dashboard</h1><p className="text-sm text-gray-400 mt-0.5">Upload XLSX Shopee / TikTok / Tokopedia</p></div>
          </div>

          <div className="card mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-brand-400 cursor-pointer transition text-sm text-gray-500 hover:text-brand-600"><Upload size={16} />{file ? file.name : 'Pilih XLSX'}<input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" /></label>
              <div className="flex gap-2">
                <button onClick={handleUpload} disabled={!file || loading} className="btn-blue">{loading ? <><Loader2 size={14} className="animate-spin" /> Loading...</> : <><Edit3 size={14} /> Proses</>}</button>
                {sheets.length > 0 && <button onClick={handleDownload} disabled={saving} className="btn-outline">{saving ? <><Loader2 size={14} className="animate-spin" />...</> : <><Download size={14} /> Download</>}</button>}
                {(sheets.length > 0 || error) && <button onClick={() => { setSheets([]); setDashboard(null); setFile(null); setError('') }} className="btn-ghost"><X size={14} /> Reset</button>}
              </div>
            </div>
          </div>

          {error && <div className="card border-red-200 bg-red-50 mb-6"><p className="text-sm text-red-700">{error}</p></div>}

          {d && (
            <>
              <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-2 flex-wrap">
                {[
                  { k: 'd1', l: 'Keseluruhan', i: TrendingUp },
                  { k: 'd2', l: 'Jumlah Transaksi', i: ShoppingBag },
                  { k: 'd3', l: 'Laba', i: Banknote },
                  { k: 'd4', l: 'Produk', i: Package },
                  { k: 'd5', l: 'Pembayaran', i: Banknote },
                  { k: 'd6', l: 'Kuantitas', i: TrendingUp },
                ].map(t => {
                  const isActive = activeTab === t.k
                  return (
                    <button key={t.k} onClick={() => setActiveTab(t.k as any)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${isActive ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      <t.i size={12} />{t.l}
                    </button>
                  )
                })}
                <button onClick={() => setActiveTab('sheet')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${activeTab === 'sheet' ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Table size={12} />Data</button>
              </div>

              {/* 1. Keseluruhan */}
              {activeTab === 'd1' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="card text-center"><p className="text-xs text-gray-400 mb-1">DEAL TRANSAKSI</p><p className="text-2xl font-bold text-blue-600">{fmtNum(d.overall.dealTransaksi)}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-400 mb-1">CANCEL TRANSAKSI</p><p className="text-2xl font-bold text-red-500">{fmtNum(d.overall.cancelTransaksi)}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-400 mb-1">TOTAL TRANSAKSI</p><p className="text-2xl font-bold text-green-600">{fmtNum(d.overall.totalTransaksi)}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-400 mb-1">QTY ITEM (PCS)</p><p className="text-2xl font-bold text-amber-600">{fmtNum(d.overall.qtyItem)}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-400 mb-1">LABA</p><p className="text-2xl font-bold text-brand-600">{fmt(d.overall.laba)}</p></div>
                  </div>
                </div>
              )}

              {/* 2. Jumlah Transaksi */}
              {activeTab === 'd2' && (
                <div className="space-y-6">
                  <div className="card">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Jumlah Transaksi (Deal & Cancel)</h3>
                    <GroupedBarChart data={d.dailyTransaksi} xKey="date" keys={['deal', 'cancel']} colors={['#3B82F6', '#F87171']} />
                    <div className="flex justify-center gap-6 mt-3 text-xs">
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500" /> Deal</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400" /> Cancel</div>
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Jumlah Transaksi (Per Minggu)</h3>
                    <div className="overflow-x-auto">
                      <table className="data-table w-full text-xs">
                        <thead><tr><th>Minggu</th><th className="text-right">Deal</th><th className="text-right">Cancel</th><th className="text-right">Total</th></tr></thead>
                        <tbody>{d.weeklyTransaksi.map((w, i) => (<tr key={i}><td className="font-medium">{w.week}</td><td className="text-right text-blue-600">{w.deal}</td><td className="text-right text-red-400">{w.cancel}</td><td className="text-right font-medium">{w.total}</td></tr>))}</tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Laba */}
              {activeTab === 'd3' && (
                <div className="space-y-6">
                  <div className="card">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Laba (Kumulatif)</h3>
                    <BarChartv data={d.weeklyLaba} xKey="week" yKey="cumulative" color="#3B82F6" />
                  </div>
                  <div className="card">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Laba per Minggu</h3>
                    <div className="overflow-x-auto">
                      <table className="data-table w-full text-xs">
                        <thead><tr><th>Minggu</th><th className="text-right">Laba</th><th className="text-right">Kumulatif</th><th>Paid</th></tr></thead>
                        <tbody>{d.weeklyLaba.map((w, i) => (<tr key={i}><td className="font-medium">{w.week}</td><td className="text-right text-brand-600 font-medium">{fmt(w.laba)}</td><td className="text-right">{fmt(w.cumulative)}</td><td className="text-green-600 text-xs">{w.paid}</td></tr>))}</tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Produk */}
              {activeTab === 'd4' && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Kualitas Pembelian / Top Produk</h3>
                  <div className="overflow-x-auto">
                    <table className="data-table w-full text-xs">
                      <thead><tr><th className="w-8">#</th><th>Produk</th><th className="text-right">Deal</th><th className="text-right">Cancel</th><th className="text-right">Total</th></tr></thead>
                      <tbody>
                        {d.productRanks.filter(p => p.total > 0).map((p, i) => (<tr key={i}><td className="text-gray-400">{i + 1}</td><td className="max-w-[250px] truncate">{p.name}</td><td className="text-right text-blue-600">{p.deal}</td><td className="text-right text-red-400">{p.cancel}</td><td className="text-right font-medium">{p.total}</td></tr>))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. Pembayaran */}
              {activeTab === 'd5' && (
                <div className="space-y-6">
                  <div className="card">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Resume Metode Pembayaran (COD)</h3>
                    <div className="overflow-x-auto">
                      <table className="data-table w-full text-xs">
                        <thead><tr><th>Minggu</th><th className="text-right">Jml Transaksi</th><th className="text-right">Qty</th></tr></thead>
                        <tbody>{d.paymentByWeek.map((w, i) => (<tr key={i}><td className="font-medium">{w.week}</td><td className="text-right">{w.codTransaksi}</td><td className="text-right">{w.codQty}</td></tr>))}</tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Kuantitas */}
              {activeTab === 'd6' && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Kuantitas Produk Terjual</h3>
                  <BarChartv data={d.qtyByWeek} xKey="week" yKey="qty" />
                  <div className="grid grid-cols-5 gap-3 mt-4 text-center">
                    {d.qtyByWeek.map((w, i) => (
                      <div key={i} className="card">
                        <p className="text-lg font-bold" style={{ color: WEEK_COLORS[w.week] || '#666' }}>{w.qty}</p>
                        <p className="text-xs text-gray-400 mt-1">{w.week}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sheet tab */}
              {activeTab === 'sheet' && (
                <>
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    {sheets.map((s, i) => (
                      <button key={i} onClick={() => { setActiveSheet(i); setEditingCell(null) }} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${i === activeSheet ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s.name}<span className="ml-1.5 text-xs opacity-70">({s.data.length})</span></button>
                    ))}
                  </div>
                  {sh && (
                    <>
                      <div className="flex items-center justify-between mb-3"><span className="text-sm text-gray-400">{sh.data.length} baris x {sh.cols} kolom</span><button onClick={handleAddRow} className="btn-ghost btn-sm"><Plus size={14} /> Tambah Baris</button></div>
                      <div className="overflow-auto rounded-xl border border-gray-200 bg-white" style={{ maxHeight: '70vh' }}>
                        <table className="data-table text-xs w-full">
                          <thead><tr><th className="w-10 sticky left-0 z-10 bg-gray-50">#</th>{sh.headers.map((h, ci) => (<th key={ci} className="min-w-[120px] max-w-[300px] whitespace-nowrap sticky top-0 bg-gray-50">{h || `Kol ${ci + 1}`}</th>))}<th className="w-10 sticky right-0 z-10 bg-gray-50"></th></tr></thead>
                          <tbody>{sh.data.map((row, ri) => (<tr key={ri}><td className="text-gray-400 text-center text-xs sticky left-0 bg-white">{ri + 1}</td>{sh.headers.map((_, ci) => { const isEditing = editingCell?.row === ri && editingCell?.col === ci; const val = row?.[ci]; const display = val != null ? String(val) : ''; if (isEditing) return (<td key={ci} className="p-0"><input ref={inputRef} type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={handleCellSave} onKeyDown={handleCellKey} className="w-full px-2 py-2 text-xs border-2 border-brand-400 outline-none bg-brand-50" /></td>); return (<td key={ci} onClick={() => handleCellClick(ri, ci)} className="cursor-pointer hover:bg-brand-50 max-w-[300px] truncate" title={display}>{display}</td>) })}<td className="sticky right-0 bg-white"><button onClick={() => handleDeleteRow(ri)} className="text-gray-300 hover:text-red-500 p-1" title="Hapus baris"><Trash2 size={12} /></button></td></tr>))}</tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
