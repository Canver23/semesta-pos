'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingCart, LayoutDashboard, Package,
  Users, FileText, Clock, BarChart2, Upload, CloudUpload, Menu, X, LogOut,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useState } from 'react'

const NAV = [
  { href: '/',           label: 'Kasir',     icon: ShoppingCart    },
  { href: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory',  label: 'Inventori', icon: Package         },
  { href: '/customers',  label: 'Pelanggan', icon: Users           },
  { href: '/invoices',   label: 'Invoice',   icon: FileText        },
  { href: '/reports',    label: 'Laporan',   icon: BarChart2       },
  { href: '/import',     label: 'Import',    icon: Upload          },
  { href: '/attendance', label: 'Absensi',   icon: Clock           },
  { href: '/migrate',    label: 'Migrasi',   icon: CloudUpload     },
]

// Bottom nav items for mobile (5 most important)
const BOTTOM_NAV = [
  { href: '/',           label: 'Kasir',     icon: ShoppingCart    },
  { href: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory',  label: 'Inventori', icon: Package         },
  { href: '/invoices',   label: 'Invoice',   icon: FileText        },
  { href: '/customers',  label: 'Lainnya',   icon: Menu            },
]

export default function Sidebar() {
  const path     = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── Desktop Sidebar (hidden on mobile) ─────────── */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 bg-white border-r border-gray-200 min-h-screen">
        <div className="px-5 py-4 border-b border-gray-200">
          <span className="text-lg font-semibold text-brand-600">
            Semesta <span className="text-brand-400">POS</span>
          </span>
          <p className="text-xs text-gray-400 mt-0.5">Semesta Plastik</p>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href
            return (
              <Link key={href} href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
                  active ? 'bg-brand-50 text-brand-800 font-medium' : 'text-gray-600 hover:bg-gray-100'
                )}>
                <Icon size={15}/>
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-400">v1.1.0</span>
          <button
            onClick={() => {
              document.cookie = 'semesta-auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
              sessionStorage.removeItem('semesta-pos-auth')
              window.location.href = '/login'
            }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition"
            title="Keluar"
          >
            <LogOut size={13}/> Keluar
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ──────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-base font-semibold text-brand-600">
          Semesta <span className="text-brand-400">POS</span>
        </span>
        <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
          <Menu size={20} className="text-gray-600"/>
        </button>
      </div>

      {/* ── Mobile Drawer Menu ──────────────────────────── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)}/>
          {/* Drawer */}
          <div className="w-64 bg-white flex flex-col h-full shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <span className="text-base font-semibold text-brand-600">
                Semesta <span className="text-brand-400">POS</span>
              </span>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={18} className="text-gray-500"/>
              </button>
            </div>
            <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = path === href
                return (
                  <Link key={href} href={href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition',
                      active ? 'bg-brand-50 text-brand-800 font-medium' : 'text-gray-600 hover:bg-gray-100'
                    )}>
                    <Icon size={18}/>
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ── Mobile Bottom Nav ───────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href
          // "Lainnya" opens drawer
          if (label === 'Lainnya') return (
            <button key="more"
              onClick={() => setOpen(true)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500">
              <Icon size={20}/>
              <span className="text-[10px]">{label}</span>
            </button>
          )
          return (
            <Link key={href} href={href}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition',
                active ? 'text-brand-600' : 'text-gray-400'
              )}>
              <Icon size={20}/>
              <span className="text-[10px]">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
