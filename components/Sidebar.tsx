'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingCart, LayoutDashboard, Package,
  Users, FileText, Clock, BarChart2, Upload,
} from 'lucide-react'
import { clsx } from 'clsx'

const NAV = [
  { href: '/',           label: 'Kasir',     icon: ShoppingCart    },
  { href: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory',  label: 'Inventori', icon: Package         },
  { href: '/customers',  label: 'Pelanggan', icon: Users           },
  { href: '/invoices',   label: 'Invoice',   icon: FileText        },
  { href: '/reports',    label: 'Laporan',   icon: BarChart2       },
  { href: '/import',     label: 'Import',    icon: Upload          },
  { href: '/attendance', label: 'Absensi',   icon: Clock           },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside className="flex flex-col w-52 shrink-0 bg-white border-r border-gray-200 min-h-screen">
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
      <div className="px-5 py-3 border-t border-gray-200 text-xs text-gray-400">v1.1.0</div>
    </aside>
  )
}
