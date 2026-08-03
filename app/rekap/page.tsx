'use client'
import { useState, useCallback, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { Upload, FileText, Copy, Check, Loader2, X, Plus, Trash2, UserCheck, Edit3, Save, RefreshCw } from 'lucide-react'

interface RecipientEntry { name: string; marketplace: 'TP' | 'SP'; resi?: string; matched?: boolean }
interface CourierGroup { courier: string; short: string; recipients: RecipientEntry[] }
interface Summary { TP: number; SP: number; total: number }
interface LabelData { courier: string; courierShort: string; recipientName: string; marketplace: 'TP' | 'SP'; resi: string }
interface FotoData { id: string; ocr: { resi: string; nama: string } | null }
interface StoredRekap { id: number; courier: string; resi: string; nama: string; marketplace: string; berat: string; photo_url: string }

export default function RekapPage() {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [groups, setGroups] = useState<CourierGroup[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [totalLabels, setTotalLabels] = useState(0)
  const [copied, setCopied] = useState(false)
  const [rawText, setRawText] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [stored, setStored] = useState<StoredRekap[]>([])
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editNama, setEditNama] = useState('')
  const [editBerat, setEditBerat] = useState('')

  const loadStored = useCallback(async () => {
    try {
      const res = await fetch('/api/rekap/list')
      const data = await res.json()
      if (data.success && data.data) setStored(data.data)
    } catch (_) {}
  }, [])

  useEffect(() => { loadStored() }, [loadStored])

  function loadFotoData(): FotoData[] {
    try { return JSON.parse(localStorage.getItem('semesta-foto-paket') || '[]') } catch (_) { return [] }
  }
  async function loadFotoDataServer(): Promise<FotoData[]> {
    try {
      const res = await fetch('/api/foto-paket/list')
      const data = await res.json()
      if (data.success && data.data) {
        return data.data.map((r: any) => ({ id: String(r.id), ocr: { resi: r.resi || '', nama: r.nama || '' } }))
      }
    } catch (_) {}
    return []
  }

  function buildStoredGroups(): { groups: CourierGroup[]; summary: Summary } {
    const map = new Map<string, RecipientEntry[]>()
    for (const row of stored) {
      if (!map.has(row.courier)) map.set(row.courier, [])
      map.get(row.courier)!.push({ name: row.nama, marketplace: (row.marketplace as 'TP' | 'SP') || 'TP', resi: row.resi, matched: false })
    }
    const order = ['AA', 'J&T', 'SPX', 'SiCepat', 'PAXEL', 'JNE', 'Pos', 'IDX', 'Ninja']
    const groupsOut: CourierGroup[] = []
    for (const short of order) {
      const rec = map.get(short)
      if (rec?.length) { groupsOut.push({ courier: short === 'J&T' ? 'J&T' : short, short, recipients: rec }); map.delete(short) }
    }
    for (const [short, recipients] of map) groupsOut.push({ courier: short, short, recipients })
    let TP = 0, SP = 0
    for (const g of groupsOut) for (const r of g.recipients) { if (r.marketplace === 'TP') TP++; else SP++ }
    return { groups: groupsOut, summary: { TP, SP, total: TP + SP } }
  }

  async function saveStored() {
    setSaving(true)
    try {
      const items = groups.flatMap(g => g.recipients.map(r => ({ courier: g.short, resi: r.resi || '', nama: r.name, marketplace: r.marketplace })))
      const res = await fetch('/api/rekap/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
      const data = await res.json()
      if (!data.success) setError(data.error || 'Gagal menyimpan')
      await loadStored()
    } catch { setError('Gagal menyimpan') }
    finally { setSaving(false) }
  }

  async function handleDeleteRow(id: number) {
    try {
      await fetch(`/api/rekap/${id}`, { method: 'DELETE' })
      await loadStored()
    } catch (_) {}
  }

  async function handleSaveEdit(id: number) {
    try {
      await fetch(`/api/rekap/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: editNama, berat: editBerat }) })
      setEditId(null)
      await loadStored()
    } catch (_) {}
  }

  const handleAddFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length > 0) { setFiles(prev => [...prev, ...newFiles]); setError('') }
    e.target.value = ''
  }, [])
  function removeFile(index: number) { setFiles(prev => prev.filter((_, i) => i !== index)) }

  const handleParse = useCallback(async () => {
    if (files.length === 0) return
    setLoading(true); setError(''); setFileErrors([]); setGroups([]); setSummary(null); setTotalLabels(0)
    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))
      const res = await fetch('/api/rekap/parse', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Gagal memproses PDF')
        if (data.fileErrors) setFileErrors(data.fileErrors)
        if (data.rawText) setRawText(data.rawText)
        return
      }
      setTotalLabels(data.totalLabels || 0)
      if (data.fileErrors) setFileErrors(data.fileErrors)

      const labels: LabelData[] = data.labels || []
      const [localFotos, serverFotos] = await Promise.all([Promise.resolve(loadFotoData()), loadFotoDataServer()])
      const resiToNama = new Map<string, string>()
      for (const f of [...localFotos, ...serverFotos]) {
        const r = f.ocr?.resi?.trim(); const n = f.ocr?.nama?.trim()
        if (r && n) resiToNama.set(r.toUpperCase(), n)
      }

      const map = new Map<string, RecipientEntry[]>()
      for (const label of labels) {
        const key = label.courierShort
        if (!map.has(key)) map.set(key, [])
        const ru = (label.resi || '').toUpperCase()
        const fn = ru ? resiToNama.get(ru) : undefined
        map.get(key)!.push({ name: fn || label.recipientName, marketplace: label.marketplace, resi: label.resi, matched: !!fn })
      }
      const order = ['AA', 'J&T', 'SPX', 'SiCepat', 'PAXEL', 'JNE', 'Pos', 'IDX', 'Ninja']
      const groupsOut: CourierGroup[] = []
      for (const short of order) {
        const rec = map.get(short)
        if (rec?.length) { groupsOut.push({ courier: short === 'J&T' ? 'J&T' : short, short, recipients: rec }); map.delete(short) }
      }
      for (const [short, recipients] of map) groupsOut.push({ courier: short, short, recipients })
      let TP = 0, SP = 0
      for (const g of groupsOut) for (const r of g.recipients) { if (r.marketplace === 'TP') TP++; else SP++ }
      setGroups(groupsOut)
      setSummary({ TP, SP, total: TP + SP })
    } catch { setError('Gagal terhubung ke server') }
    finally { setLoading(false) }
  }, [files])

  function buildRekapText(): string {
    let text = ''
    for (const group of groups) {
      text += `${group.courier}\n`
      group.recipients.forEach((r, i) => { text += `${i + 1}. ${r.name} (${r.marketplace})\n` })
      text += '\n'
    }
    if (summary) { text += `\nTP : ${summary.TP}\n`; text += `SP : ${summary.SP}\n` }
    return text
  }
  async function handleCopy() { const text = buildRekapText(); await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  function handleClear() { setFiles([]); setGroups([]); setSummary(null); setTotalLabels(0); setError(''); setFileErrors([]) }

  const storedView = groups.length === 0

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-0">
        <div className="pt-14 md:pt-0 pb-16 md:pb-0 px-4 md:px-6 py-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Rekap Paket</h1>
              <p className="text-sm text-gray-400 mt-0.5">Simpan, edit, dan auto-update dari Foto Paket</p>
            </div>
            <button onClick={loadStored} className="btn-ghost btn-sm"><RefreshCw size={14} /> Refresh</button>
          </div>

          <div className="card mb-6">
            {files.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs text-gray-400">{files.length} file dipilih ({files.map(f => f.name).join(', ')})</p>
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-600">
                      {f.name}
                      <button onClick={() => removeFile(i)} className="hover:text-red-500"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-brand-400 cursor-pointer transition text-sm text-gray-500 hover:text-brand-600">
                <Plus size={16} /> {files.length > 0 ? 'Tambah PDF' : 'Pilih PDF'}
                <input type="file" accept=".pdf" multiple onChange={handleAddFiles} className="hidden" />
              </label>
              {files.length > 0 && <button onClick={() => setFiles([])} className="btn-ghost btn-sm text-red-500"><Trash2 size={14} /> Hapus semua</button>}
              <button onClick={handleParse} disabled={files.length === 0 || loading} className="btn-blue">
                {loading ? <><Loader2 size={14} className="animate-spin" /> Memproses...</> : <><FileText size={14} /> Proses Rekap</>}
              </button>
              <button onClick={saveStored} disabled={saving || groups.length === 0} className="btn-outline">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : <><Save size={14} /> Simpan ke Supabase</>}
              </button>
              {(groups.length > 0 || error) && <button onClick={handleClear} className="btn-ghost"><X size={14} /> Reset</button>}
            </div>
          </div>

          {(error || fileErrors.length > 0) && (
            <div className="card border-red-200 bg-red-50 mb-6">
              {error && <p className="text-sm text-red-700">{error}</p>}
              {fileErrors.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-red-500 font-medium mb-1">Error per file:</p>
                  <ul className="text-xs text-red-400 list-disc list-inside">{fileErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              {rawText && (
                <div className="mt-3">
                  <button onClick={() => setShowRaw(!showRaw)} className="text-xs text-red-500 underline">{showRaw ? 'Sembunyikan' : 'Lihat'} raw text dari PDF</button>
                  {showRaw && <pre className="mt-2 text-xs text-red-600 bg-red-100 p-3 rounded-lg max-h-60 overflow-auto whitespace-pre-wrap">{rawText}</pre>}
                </div>
              )}
            </div>
          )}

          {/* View: hasil parse / stored */}
          {storedView && stored.length === 0 && groups.length === 0 && (
            <div className="card text-center py-8 text-sm text-gray-400">
              Belum ada data rekap. Upload PDF label atau simpan hasil parse.
            </div>
          )}

          {storedView && stored.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Data Tersimpan ({stored.length})</h3>
              <div className="overflow-x-auto">
                <table className="data-table w-full text-xs">
                  <thead><tr><th>Ekspedisi</th><th>Resi</th><th>Nama</th><th>Market</th><th>Berat</th><th></th></tr></thead>
                  <tbody>
                    {stored.map(row => (
                      <tr key={row.id}>
                        <td>{row.courier}</td>
                        <td className="font-mono">{row.resi}</td>
                        <td>
                          {editId === row.id ? (
                            <input value={editNama} onChange={e => setEditNama(e.target.value)} className="w-40 px-2 py-1 border rounded text-xs" />
                          ) : <span className={row.nama.includes('*') ? 'text-gray-400' : ''}>{row.nama}</span>}
                        </td>
                        <td>{row.marketplace}</td>
                        <td>
                          {editId === row.id ? (
                            <input value={editBerat} onChange={e => setEditBerat(e.target.value)} className="w-20 px-2 py-1 border rounded text-xs" />
                          ) : row.berat}
                        </td>
                        <td className="flex gap-1">
                          {editId === row.id ? (
                            <button onClick={() => handleSaveEdit(row.id)} className="text-green-500" title="Simpan"><Save size={13} /></button>
                          ) : (
                            <button onClick={() => { setEditId(row.id); setEditNama(row.nama); setEditBerat(row.berat || '') }} className="text-gray-400 hover:text-blue-500" title="Edit"><Edit3 size={13} /></button>
                          )}
                          {editId === row.id && <button onClick={() => setEditId(null)} className="text-gray-400"><X size={13} /></button>}
                          <button onClick={() => handleDeleteRow(row.id)} className="text-gray-400 hover:text-red-500" title="Hapus"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!storedView && groups.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 text-sm flex-wrap">
                  <span className="badge-blue">{totalLabels} label</span>
                  <span className="badge-gray">Total: {summary?.total ?? 0} paket</span>
                  <span className="badge-amber">TP: {summary?.TP ?? 0}</span>
                  <span className="badge-red">SP: {summary?.SP ?? 0}</span>
                </div>
                <button onClick={handleCopy} className="btn-ghost btn-sm">
                  {copied ? <><Check size={14} /> Disalin</> : <><Copy size={14} /> Salin</>}
                </button>
              </div>

              <div className="card p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap select-all">
                {groups.map((group, gi) => (
                  <div key={gi} className="mb-3">
                    <span className="font-semibold">{group.courier}</span>
                    {group.recipients.map((r, i) => (
                      <div key={i} className="ml-2">
                        {i + 1}. {r.name} ({r.marketplace})
                        {r.matched && <UserCheck size={11} className="inline ml-1 text-green-500" />}
                        {r.resi && <span className="text-[10px] text-gray-300 ml-2">{r.resi}</span>}
                      </div>
                    ))}
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div>TP : {summary?.TP ?? 0}</div>
                  <div>SP : {summary?.SP ?? 0}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
