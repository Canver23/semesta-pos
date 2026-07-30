'use client'
import { useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import { Upload, FileText, Copy, Check, Loader2, X, Plus, Trash2 } from 'lucide-react'

interface RecipientEntry { name: string; marketplace: 'TP' | 'SP' }
interface CourierGroup { courier: string; short: string; recipients: RecipientEntry[] }
interface Summary { TP: number; SP: number; total: number }

export default function RekapPage() {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [groups, setGroups] = useState<CourierGroup[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [totalLabels, setTotalLabels] = useState(0)
  const [copied, setCopied] = useState(false)

  const handleAddFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
      setError('')
    }
    e.target.value = ''
  }, [])

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleParse = useCallback(async () => {
    if (files.length === 0) return
    setLoading(true)
    setError('')
    setFileErrors([])
    setGroups([])
    setSummary(null)
    setTotalLabels(0)

    try {
      const fd = new FormData()
      files.forEach(f => fd.append('files', f))

      const res = await fetch('/api/rekap/parse', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Gagal memproses PDF')
        if (data.fileErrors) setFileErrors(data.fileErrors)
        return
      }

      setGroups(data.groups || [])
      setSummary(data.summary || null)
      setTotalLabels(data.totalLabels || 0)
      if (data.fileErrors) setFileErrors(data.fileErrors)
    } catch {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }, [files])

  function buildRekapText(): string {
    let text = ''
    for (const group of groups) {
      text += `${group.courier}\n`
      group.recipients.forEach((r, i) => {
        text += `${i + 1}. ${r.name} (${r.marketplace})\n`
      })
      text += '\n'
    }

    if (summary) {
      text += `\nTP : ${summary.TP}\n`
      text += `SP : ${summary.SP}\n`
    }
    return text
  }

  async function handleCopy() {
    const text = buildRekapText()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClear() {
    setFiles([])
    setGroups([])
    setSummary(null)
    setTotalLabels(0)
    setError('')
    setFileErrors([])
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-0">
        <div className="pt-14 md:pt-0 pb-16 md:pb-0 px-4 md:px-6 py-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Rekap Paket</h1>
              <p className="text-sm text-gray-400 mt-0.5">Upload PDF label pengiriman (multi-file, multi-halaman)</p>
            </div>
          </div>

          <div className="card mb-6">
            {files.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs text-gray-400">
                  {files.length} file dipilih ({files.map(f => f.name).join(', ')})
                </p>
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-600">
                      {f.name}
                      <button onClick={() => removeFile(i)} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-brand-400 cursor-pointer transition text-sm text-gray-500 hover:text-brand-600">
                <Plus size={16} />
                {files.length > 0 ? 'Tambah PDF' : 'Pilih PDF'}
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleAddFiles}
                  className="hidden"
                />
              </label>
              {files.length > 0 && (
                <button onClick={() => setFiles([])} className="btn-ghost btn-sm text-red-500">
                  <Trash2 size={14} /> Hapus semua
                </button>
              )}
              <button
                onClick={handleParse}
                disabled={files.length === 0 || loading}
                className="btn-blue"
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" /> Memproses {files.length} file...</>
                ) : (
                  <><FileText size={14} /> Proses Rekap ({files.length} file)</>
                )}
              </button>
              {(groups.length > 0 || error) && (
                <button onClick={handleClear} className="btn-ghost">
                  <X size={14} /> Reset
                </button>
              )}
            </div>
          </div>

          {(error || fileErrors.length > 0) && (
            <div className="card border-red-200 bg-red-50 mb-6">
              {error && <p className="text-sm text-red-700">{error}</p>}
              {fileErrors.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-red-500 font-medium mb-1">Error per file:</p>
                  <ul className="text-xs text-red-400 list-disc list-inside">
                    {fileErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {groups.length > 0 && (
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
