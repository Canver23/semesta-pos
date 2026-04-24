'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { useStore } from '@/lib/store'
import { CheckCircle, AlertCircle, Database, ArrowRight } from 'lucide-react'

interface MigrateResult {
  success: boolean
  results?: Record<string, number>
  errors?: string[]
}

export default function MigratePage() {
  const { loadAll } = useStore()
  const [status, setStatus]   = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult]   = useState<MigrateResult | null>(null)
  const [preview, setPreview] = useState<Record<string, number> | null>(null)

  function readLocalStorage() {
    try {
      const raw  = localStorage.getItem('semesta-pos-storage')
      if (!raw) return null
      const data = JSON.parse(raw)
      return data.state ?? data
    } catch {
      return null
    }
  }

  function handlePreview() {
    const data = readLocalStorage()
    if (!data) {
      alert('Tidak ada data di localStorage browser ini.\nMungkin kamu sudah pakai Supabase, atau data ada di browser/komputer lain.')
      return
    }
    setPreview({
      products:   data.products?.length ?? 0,
      customers:  data.customers?.length ?? 0,
      invoices:   data.invoices?.length ?? 0,
      transactions: data.transactions?.length ?? 0,
      attendance: data.attendanceLogs?.length ?? 0,
      categories: data.customCategories?.length ?? 0,
    })
  }

  async function handleMigrate() {
    const data = readLocalStorage()
    if (!data) { alert('Tidak ada data localStorage yang bisa dimitrasi.'); return }

    setStatus('running')
    try {
      const res = await fetch('/api/migrate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products:         data.products ?? [],
          customers:        data.customers ?? [],
          invoices:         data.invoices ?? [],
          transactions:     data.transactions ?? [],
          attendanceLogs:   data.attendanceLogs ?? [],
          customCategories: data.customCategories ?? [],
        }),
      })
      const json: MigrateResult = await res.json()
      setResult(json)
      setStatus(json.success ? 'done' : 'error')
      if (json.success) {
        // Reload data from Supabase
        await loadAll()
      }
    } catch (e) {
      setResult({ success: false, errors: [String(e)] })
      setStatus('error')
    }
  }

  return (
    <div className="flex min-h-screen pt-14 pb-16 md:pt-0 md:pb-0">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Migrasi Data ke Cloud</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pindahkan data lama dari browser (localStorage) ke Supabase — cukup dilakukan sekali.
          </p>
        </div>

        <div className="max-w-xl flex flex-col gap-5">

          {/* Flow diagram */}
          <div className="card">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Data lama</p>
                <p className="font-medium">localStorage</p>
                <p className="text-xs text-gray-400">browser ini saja</p>
              </div>
              <ArrowRight size={20} className="text-brand-400 shrink-0"/>
              <div className="flex-1 bg-brand-50 rounded-lg p-3 text-center border border-brand-200">
                <p className="text-xs text-brand-600 mb-1">Data baru</p>
                <p className="font-medium text-brand-800">Supabase Cloud</p>
                <p className="text-xs text-brand-600">semua perangkat</p>
              </div>
            </div>
          </div>

          {/* Step 1: Preview */}
          {status === 'idle' && (
            <div className="flex flex-col gap-3">
              <div className="card">
                <p className="text-sm font-medium mb-3">Langkah 1 — Cek data localStorage</p>
                <p className="text-xs text-gray-500 mb-3">
                  Klik tombol di bawah untuk melihat data apa saja yang ada di browser ini.
                  Pastikan kamu menjalankan ini di komputer/browser yang selama ini dipakai sebagai kasir.
                </p>
                <button onClick={handlePreview} className="btn-outline">
                  <Database size={14}/> Cek Data Lokal
                </button>
              </div>

              {preview && (
                <div className="card border-brand-200">
                  <p className="text-sm font-medium mb-3">Data yang akan dimitrasi:</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {Object.entries(preview).map(([key, count]) => (
                      <div key={key} className="bg-gray-50 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-semibold text-brand-600">{count}</p>
                        <p className="text-xs text-gray-500 capitalize">{key}</p>
                      </div>
                    ))}
                  </div>
                  {Object.values(preview).every(v => v === 0) ? (
                    <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
                      ⚠ Semua data kosong. Pastikan kamu membuka halaman ini di browser yang sama dengan yang dipakai kasir sebelumnya.
                    </div>
                  ) : (
                    <button onClick={handleMigrate} className="btn-blue w-full">
                      Mulai Migrasi ke Supabase
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Running */}
          {status === 'running' && (
            <div className="card flex items-center gap-4">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-400 rounded-full animate-spin shrink-0"/>
              <div>
                <p className="font-medium text-sm">Sedang migrasi...</p>
                <p className="text-xs text-gray-500 mt-0.5">Mengirim data ke Supabase. Jangan tutup halaman ini.</p>
              </div>
            </div>
          )}

          {/* Done */}
          {status === 'done' && result && (
            <div className="flex flex-col gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle size={22} className="text-green-600"/>
                  <p className="font-medium text-green-800">Migrasi Berhasil!</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(result.results ?? {}).map(([key, count]) => (
                    <div key={key} className="bg-white rounded-lg p-2.5 text-center border border-green-200">
                      <p className="text-xl font-semibold text-green-700">{count}</p>
                      <p className="text-xs text-gray-500 capitalize">{key}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
                <p className="font-medium mb-1">✅ Selesai! Selanjutnya:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Data sekarang tersimpan di Supabase — bisa diakses dari semua perangkat</li>
                  <li>localStorage lama tidak dihapus otomatis — kamu bisa hapus manual via DevTools jika mau</li>
                  <li>Buka POS di komputer lain — data akan otomatis muncul</li>
                </ul>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && result && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-red-600"/>
                <p className="font-medium text-red-800 text-sm">Ada Error</p>
              </div>
              {result.errors?.map((e, i) => (
                <p key={i} className="text-xs text-red-700">• {e}</p>
              ))}
              <button onClick={() => setStatus('idle')} className="btn-outline mt-3 text-xs">
                Coba Lagi
              </button>
            </div>
          )}

          {/* Info note */}
          {status === 'idle' && !preview && (
            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
              <p className="font-medium text-gray-700 mb-1">Catatan penting:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Migrasi ini hanya perlu dilakukan <strong>sekali</strong> dari komputer kasir lama</li>
                <li>Setelah migrasi, semua perangkat akan baca/tulis langsung ke Supabase</li>
                <li>Jika Supabase belum di-setup, data ini akan gagal terkirim — setup Supabase dulu</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
