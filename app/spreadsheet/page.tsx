'use client'
import { useState, useCallback, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import { Upload, Download, Loader2, X, Edit3, Plus, Trash2, LayoutDashboard, Table } from 'lucide-react'

interface SheetInfo { name: string; rows: number; cols: number; headers: string[]; data: any[][] }

interface MetricData {
  totalRevenue: number; totalOrders: number; totalQty: number
  revenueByDay: { date: string; revenue: number }[]
  courierDistribution: { name: string; count: number; color: string }[]
  topProducts: { name: string; qty: number }[]
  platformBreakdown: { platform: string; orders: number; revenue: number }
  dailyData?: { date: string; transaksi: number; cancel: number; produk: number }[]
  weeklyData?: { week: string; transaksi: number; produk: number; laba: number }[]
  productRank?: { name: string; deal: number; cancel: number; total: number }[]
  summary?: { totalTransaksi: number; totalCancel: number; totalProduk: number; totalLaba: number }
}

function fmt(v: number): string { return 'Rp ' + v.toLocaleString('id-ID') }

function fmtNum(v: number): string { return v.toLocaleString('id-ID') }

function ColumnChart({ data, columns, colors }: { data: { label: string }[], columns: { key: string; label: string; color: string }[], colors?: string[] }) {
  const max = Math.max(1, ...data.flatMap(d => columns.map(c => (d as any)[c.key] || 0)))
  const barW = Math.max(20, Math.min(40, 400 / data.length))
  return (
    <div className="flex items-end gap-1 h-48 px-1">
      {data.map((d: any, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
          <div className="flex flex-col-reverse items-center w-full h-full">
            {columns.map((col, ci) => (
              <div key={ci} style={{ height: `${((d[col.key] || 0) / max) * 100}%`, width: barW, backgroundColor: col.color }} className="rounded-t transition-all hover:opacity-80" />
            ))}
          </div>
          <span className="text-[10px] text-gray-400 mt-1">{d.label}</span>
          <div className="hidden group-hover:block absolute bottom-6 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
            {columns.map(c => `${c.label}: ${d[c.key] || 0}`).join(' | ')}
          </div>
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
  const [platform, setPlatform] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<MetricData | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sheet'>('dashboard')
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
      setSheets(data.sheets || []); setPlatform(data.platform); setDashboard(data.dashboard)
      setActiveTab(data.dashboard ? 'dashboard' : 'sheet')
    } catch { setError('Gagal terhubung') } finally { setLoading(false) }
  }, [file])

  function handleCellClick(row: number, col: number) {
    const sheet = sheets[activeSheet]; if (!sheet) return
    const val = sheet.data[row]?.[col]; setEditingCell({ row, col }); setEditValue(val != null ? String(val) : '')
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
    if (e.key === 'Tab') { e.preventDefault(); handleCellSave(); if (editingCell) { const nc = editingCell.col + 1; if (nc < (sheets[activeSheet]?.cols ?? 0)) handleCellClick(editingCell.row, nc) } }
  }
  function handleAddRow() { const ns = [...sheets]; ns[activeSheet].data.push(new Array(ns[activeSheet].cols).fill('')); setSheets(ns) }
  function handleDeleteRow(ri: number) { const ns = [...sheets]; ns[activeSheet].data.splice(ri, 1); setSheets(ns) }
  async function handleDownload() {
    setSaving(true)
    try {
      const res = await fetch('/api/spreadsheet/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file?.name, sheets: sheets.map(s => ({ name: s.name, headers: s.headers, data: s.data })) }) })
      if (!res.ok) throw new Error('')
      const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a')
      a.href = url; a.download = file?.name || 'spreadsheet.xlsx'; a.click(); URL.revokeObjectURL(url)
    } catch { setError('Gagal menyimpan') } finally { setSaving(false) }
  }

  const sheet = sheets[activeSheet]
  const d = dashboard

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-0">
        <div className="pt-14 md:pt-0 pb-16 md:pb-0 px-4 md:px-6 py-6 max-w-full">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Spreadsheet</h1>
              <p className="text-sm text-gray-400 mt-0.5">Upload XLSX Shopee / Tokopedia / TikTok</p>
            </div>
          </div>

          <div className="card mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-brand-400 cursor-pointer transition text-sm text-gray-500 hover:text-brand-600">
                <Upload size={16} />{file ? file.name : 'Pilih XLSX'}
                <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              </label>
              <div className="flex gap-2">
                <button onClick={handleUpload} disabled={!file || loading} className="btn-blue">
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Loading...</> : <><Edit3 size={14} /> Proses</>}
                </button>
                {sheets.length > 0 && <button onClick={handleDownload} disabled={saving} className="btn-outline">{saving ? <><Loader2 size={14} className="animate-spin" />...</> : <><Download size={14} /> Download</>}</button>}
                {(sheets.length > 0 || error) && <button onClick={() => { setSheets([]); setDashboard(null); setFile(null); setError('') }} className="btn-ghost"><X size={14} /> Reset</button>}
              </div>
            </div>
          </div>

          {error && <div className="card border-red-200 bg-red-50 mb-6"><p className="text-sm text-red-700">{error}</p></div>}

          {d && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><LayoutDashboard size={14} /> Dashboard</button>
                <button onClick={() => setActiveTab('sheet')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'sheet' ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Table size={14} /> Data</button>
              </div>

              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  {d.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="card"><p className="text-xs text-gray-400">Total Transaksi</p><p className="text-xl font-semibold text-blue-600">{fmtNum(d.summary.totalTransaksi)}</p></div>
                      <div className="card"><p className="text-xs text-gray-400">Total Cancel</p><p className="text-xl font-semibold text-red-500">{fmtNum(d.summary.totalCancel)}</p></div>
                      <div className="card"><p className="text-xs text-gray-400">Total Produk</p><p className="text-xl font-semibold text-green-600">{fmtNum(d.summary.totalProduk)}</p></div>
                      <div className="card"><p className="text-xs text-gray-400">Total Laba</p><p className="text-xl font-semibold text-brand-600">{fmt(d.summary.totalLaba)}</p></div>
                    </div>
                  )}

                  {!d.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="card"><p className="text-xs text-gray-400">Platform</p><p className="text-xl font-semibold">{d.platformBreakdown.platform}</p></div>
                      <div className="card"><p className="text-xs text-gray-400">Total Orders</p><p className="text-xl font-semibold">{d.platformBreakdown.orders}</p></div>
                      <div className="card"><p className="text-xs text-gray-400">Total Qty</p><p className="text-xl font-semibold">{d.totalQty}</p></div>
                      <div className="card"><p className="text-xs text-gray-400">Total Revenue</p><p className="text-xl font-semibold text-brand-600">{fmt(d.platformBreakdown.revenue)}</p></div>
                    </div>
                  )}

                  {/* Chart 1: Transaksi Harian */}
                  {d.dailyData && d.dailyData.length > 0 && (
                    <div className="card">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Transaksi Harian (Juli 2026)</h3>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded bg-blue-500" /> Transaksi</div>
                        <div className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded bg-red-400" /> Cancel</div>
                        <div className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded bg-green-500" /> Produk</div>
                      </div>
                      <ColumnChart data={d.dailyData.map(r => ({ label: r.date, transaksi: r.transaksi, cancel: r.cancel, produk: r.produk }))}
                        columns={[{ key: 'transaksi', label: 'Transaksi', color: '#3B82F6' }, { key: 'cancel', label: 'Cancel', color: '#F87171' }, { key: 'produk', label: 'Produk', color: '#10B981' }]} />
                    </div>
                  )}

                  {/* Chart 2: Mingguan */}
                  {d.weeklyData && d.weeklyData.length > 0 && (
                    <div className="card">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Performa Mingguan</h3>
                      <div className="flex justify-between mb-3">
                        <div className="flex gap-4 text-xs">
                          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Transaksi</div>
                          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500" /> Produk</div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded bg-amber-500" /> Laba</div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="data-table w-full text-xs">
                          <thead><tr><th>Minggu</th><th className="text-right">Transaksi</th><th className="text-right">Produk</th><th className="text-right">Laba</th></tr></thead>
                          <tbody>
                            {d.weeklyData.map((w, i) => (
                              <tr key={i}>
                                <td className="font-medium">{w.week}</td>
                                <td className="text-right">{w.transaksi}</td>
                                <td className="text-right">{w.produk}</td>
                                <td className="text-right font-medium text-brand-600">{fmt(w.laba)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Chart 3: Product Ranking */}
                  {d.productRank && d.productRank.length > 0 && (
                    <div className="card">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Ranking Produk</h3>
                      <div className="overflow-x-auto">
                        <table className="data-table w-full text-xs">
                          <thead><tr><th className="w-8">#</th><th>Produk</th><th className="text-right">Deal</th><th className="text-right">Cancel</th><th className="text-right">Total</th></tr></thead>
                          <tbody>
                            {d.productRank.map((p, i) => (
                              <tr key={i}>
                                <td className="text-gray-400">{i + 1}</td>
                                <td className="max-w-[200px] truncate">{p.name}</td>
                                <td className="text-right text-blue-600">{p.deal}</td>
                                <td className="text-right text-red-400">{p.cancel}</td>
                                <td className="text-right font-medium">{p.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Chart 4: Courier Distribution */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribusi Ekspedisi</h3>
                      <div className="space-y-2">
                        {d.courierDistribution.map((c, i) => {
                          const max = Math.max(...d.courierDistribution.map(x => x.count)); const pct = Math.round((c.count / max) * 100)
                          return (<div key={i} className="flex items-center gap-2 text-xs"><span className="w-16 truncate text-gray-600">{c.name}</span><div className="flex-1 bg-gray-100 rounded-full h-4"><div className="h-4 rounded-full text-white text-[10px] flex items-center justify-end pr-1.5 font-medium" style={{ width: `${pct}%`, backgroundColor: c.color }}>{c.count}</div></div></div>)
                        })}
                      </div>
                    </div>
                    <div className="card">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 10 Produk</h3>
                      <div className="space-y-2">
                        {d.topProducts.map((p, i) => {
                          const max = Math.max(...d.topProducts.map(x => x.qty)); const pct = Math.round((p.qty / max) * 100)
                          return (<div key={i} className="flex items-center gap-2 text-xs"><span className="w-28 truncate text-gray-600">{p.name}</span><div className="flex-1 bg-gray-100 rounded-full h-4"><div className="h-4 rounded-full bg-brand-400 text-white text-[10px] flex items-center justify-end pr-1.5 font-medium" style={{ width: `${pct}%` }}>{p.qty}</div></div></div>)
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sheet' && (
                <>
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    {sheets.map((s, i) => (
                      <button key={i} onClick={() => { setActiveSheet(i); setEditingCell(null) }} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${i === activeSheet ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s.name} <span className="ml-1.5 text-xs opacity-70">({s.data.length})</span>
                      </button>
                    ))}
                  </div>
                  {sheet && (
                    <>
                      <div className="flex items-center justify-between mb-3"><span className="text-sm text-gray-400">{sheet.data.length} baris x {sheet.cols} kolom</span><button onClick={handleAddRow} className="btn-ghost btn-sm"><Plus size={14} /> Tambah Baris</button></div>
                      <div className="overflow-auto rounded-xl border border-gray-200 bg-white" style={{ maxHeight: '70vh' }}>
                        <table className="data-table text-xs w-full">
                          <thead><tr><th className="w-10 sticky left-0 z-10 bg-gray-50">#</th>{sheet.headers.map((h, ci) => (<th key={ci} className="min-w-[120px] max-w-[300px] whitespace-nowrap sticky top-0 bg-gray-50">{h || `Kol ${ci + 1}`}</th>))}<th className="w-10 sticky right-0 z-10 bg-gray-50"></th></tr></thead>
                          <tbody>
                            {sheet.data.map((row, ri) => (
                              <tr key={ri}>
                                <td className="text-gray-400 text-center text-xs sticky left-0 bg-white">{ri + 1}</td>
                                {sheet.headers.map((_, ci) => {
                                  const isEditing = editingCell?.row === ri && editingCell?.col === ci; const val = row?.[ci]; const display = val != null ? String(val) : ''
                                  if (isEditing) return (<td key={ci} className="p-0"><input ref={inputRef} type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={handleCellSave} onKeyDown={handleCellKey} className="w-full px-2 py-2 text-xs border-2 border-brand-400 outline-none bg-brand-50" /></td>)
                                  return (<td key={ci} onClick={() => handleCellClick(ri, ci)} className="cursor-pointer hover:bg-brand-50 max-w-[300px] truncate" title={display}>{display}</td>)
                                })}
                                <td className="sticky right-0 bg-white"><button onClick={() => handleDeleteRow(ri)} className="text-gray-300 hover:text-red-500 p-1" title="Hapus baris"><Trash2 size={12} /></button></td>
                              </tr>
                            ))}
                          </tbody>
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
