'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const SIZES = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-2xl',
  xl:  'max-w-4xl',
}

export default function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  // close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-10 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={clsx('bg-white rounded-xl border border-gray-200 w-full shadow-lg', SIZES[size])}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-medium text-gray-900">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1 rounded-md">
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
