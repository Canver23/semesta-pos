'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'

export default function DataLoader() {
  const { loadAll, resetData, loading, initialized } = useStore()
  const pathname = usePathname()

  useEffect(() => {
    // Halaman login belum punya sesi → jangan memuat data (semua request
    // akan 401 dan store "terkunci" tanpa data). Bersihkan sisa data
    // pengguna sebelumnya.
    if (pathname.startsWith('/login')) {
      resetData()
      return
    }
    loadAll()
  }, [pathname, loadAll, resetData])

  if (!initialized && loading) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-400 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Memuat data dari server...</p>
        </div>
      </div>
    )
  }

  return null
}
