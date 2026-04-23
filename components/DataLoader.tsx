'use client'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export default function DataLoader() {
  const { loadAll, loading, initialized } = useStore()

  useEffect(() => {
    loadAll()
  }, [loadAll])

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
