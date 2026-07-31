'use client'
import { useState, useCallback, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import { Upload, Download, Loader2, X, Edit3, Save, ChevronDown, Plus, Trash2 } from 'lucide-react'

interface SheetInfo {
  name: string
  rows: number
  cols: number
  headers: string[]
  data: any[][]
}

export default function SpreadsheetPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sheets, setSheets] = useState<SheetInfo[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setError('')
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setSheets([])
    setActiveSheet(0)

    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/spreadsheet/parse', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || 'Gagal memproses file')
        return
      }

      setSheets(data.sheets || [])
    } catch {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }, [file])

  function handleCellClick(row: number, col: number) {
    const sheet = sheets[activeSheet]
    if (!sheet) return
    const val = sheet.data[row]?.[col]
    setEditingCell({ row, col })
    setEditValue(val !== null && val !== undefined ? String(val) : '')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleCellSave() {
    if (!editingCell) return
    const { row, col } = editingCell
    const newSheets = [...sheets]
    if (!newSheets[activeSheet].data[row]) {
      newSheets[activeSheet].data[row] = []
    }
    newSheets[activeSheet].data[row][col] = editValue
    setSheets(newSheets)
    setEditingCell(null)
  }

  function handleCellKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCellSave()
    if (e.key === 'Escape') setEditingCell(null)
    if (e.key === 'Tab') {
      e.preventDefault()
      handleCellSave()
      if (editingCell) {
        const nextCol = editingCell.col + 1
        if (nextCol < (sheets[activeSheet]?.cols ?? 0)) {
          handleCellClick(editingCell.row, nextCol)
        }
      }
    }
  }

  function handleAddRow() {
    const newSheets = [...sheets]
    newSheets[activeSheet].data.push(new Array(newSheets[activeSheet].cols).fill(''))
    setSheets(newSheets)
  }

  function handleDeleteRow(rowIdx: number) {
    const newSheets = [...sheets]
    newSheets[activeSheet].data.splice(rowIdx, 1)
    setSheets(newSheets)
  }

  async function handleDownload() {
    setSaving(true)
    try {
      const res = await fetch('/api/spreadsheet/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file?.name || 'spreadsheet.xlsx',
          sheets: sheets.map(s => ({
            name: s.name,
            headers: s.headers,
            data: s.data,
          })),
        }),
      })

      if (!res.ok) throw new Error('Gagal')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file?.name || 'spreadsheet.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Gagal menyimpan file')
    } finally {
      setSaving(false)
    }
  }

  const sheet = sheets[activeSheet]

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-0">
        <div className="pt-14 md:pt-0 pb-16 md:pb-0 px-4 md:px-6 py-6 max-w-full">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Spreadsheet</h1>
              <p className="text-sm text-gray-400 mt-0.5">Upload, edit, dan download file XLSX</p>
            </div>
          </div>

          <div className="card mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-brand-400 cursor-pointer transition text-sm text-gray-500 hover:text-brand-600">
                <Upload size={16} />
                {file ? file.name : 'Pilih XLSX'}
                <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              </label>
              <div className="flex gap-2">
                <button onClick={handleUpload} disabled={!file || loading} className="btn-blue">
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Loading...</> : <><Edit3 size={14} /> Buka File</>}
                </button>
                {sheets.length > 0 && (
                  <button onClick={handleDownload} disabled={saving} className="btn-outline">
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Download size={14} /> Download</>}
                  </button>
                )}
                {error && (
                  <button onClick={() => { setSheets([]); setFile(null); setError('') }} className="btn-ghost">
                    <X size={14} /> Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="card border-red-200 bg-red-50 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {sheets.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                {sheets.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveSheet(i); setEditingCell(null) }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                      i === activeSheet
                        ? 'bg-brand-400 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.name}
                    <span className="ml-1.5 text-xs opacity-70">({s.data.length})</span>
                  </button>
                ))}
              </div>

              {sheet && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">
                      {sheet.data.length} baris x {sheet.cols} kolom
                    </span>
                    <button onClick={handleAddRow} className="btn-ghost btn-sm">
                      <Plus size={14} /> Tambah Baris
                    </button>
                  </div>

                  <div className="overflow-auto rounded-xl border border-gray-200 bg-white" style={{ maxHeight: '70vh' }}>
                    <table className="data-table text-xs w-full">
                      <thead>
                        <tr>
                          <th className="w-10 sticky left-0 z-10 bg-gray-50">#</th>
                          {sheet.headers.map((h, ci) => (
                            <th key={ci} className="min-w-[120px] max-w-[300px] whitespace-nowrap sticky top-0">
                              {h || `Kol ${ci + 1}`}
                            </th>
                          ))}
                          <th className="w-10 sticky right-0 z-10 bg-gray-50"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.data.map((row, ri) => (
                          <tr key={ri}>
                            <td className="text-gray-400 text-center text-xs sticky left-0 bg-white">{ri + 1}</td>
                            {sheet.headers.map((_, ci) => {
                              const isEditing = editingCell?.row === ri && editingCell?.col === ci
                              const val = row?.[ci]
                              const display = val !== null && val !== undefined ? String(val) : ''

                              if (isEditing) {
                                return (
                                  <td key={ci} className="p-0">
                                    <input
                                      ref={inputRef}
                                      type="text"
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      onBlur={handleCellSave}
                                      onKeyDown={handleCellKey}
                                      className="w-full px-2 py-2 text-xs border-2 border-brand-400 outline-none bg-brand-50"
                                    />
                                  </td>
                                )
                              }

                              return (
                                <td
                                  key={ci}
                                  onClick={() => handleCellClick(ri, ci)}
                                  className="cursor-pointer hover:bg-brand-50 max-w-[300px] truncate"
                                  title={display}
                                >
                                  {display}
                                </td>
                              )
                            })}
                            <td className="sticky right-0 bg-white">
                              <button
                                onClick={() => handleDeleteRow(ri)}
                                className="text-gray-300 hover:text-red-500 p-1"
                                title="Hapus baris"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
