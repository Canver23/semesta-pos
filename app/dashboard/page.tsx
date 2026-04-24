'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { useStore } from '@/lib/store'
import { fmt } from '@/lib/utils'
import { TrendingUp, ShoppingBag, ReceiptText, Users, Trash2, RotateCcw } from 'lucide-react'

export default function DashboardPage() {
  const { transactions, invoices, customers, deleteTransaction, resetTransactions } = useStore()
  const [confirmReset, setConfirmReset] = useState(false)

  const todayStr  = new Date().toLocaleDateString('id-ID')
  const todayTrx  = transactions.filter(t => t.date === todayStr)
  const todayRev  = todayTrx.reduce((s,t) => s+t.total, 0)
  const totalRev  = transactions.reduce((s,t) => s+t.total, 0)
  const avgOrder  = transactions.length ? Math.round(totalRev / transactions.length) : 0
  const unpaidInv = invoices.filter(i => i.status === 'Belum Lunas')
  const unpaidTotal = unpaidInv.reduce((s,i) => s+i.total, 0)

  const metrics = [
    { label:'Pendapatan Hari Ini', value: fmt(todayRev),           icon: TrendingUp,  color:'text-brand-600' },
    { label:'Total Pendapatan',    value: fmt(totalRev),           icon: TrendingUp,  color:'text-green-600' },
    { label:'Rata-rata Order',     value: fmt(avgOrder),           icon: ShoppingBag, color:'text-amber-600' },
    { label:'Piutang Belum Lunas', value: fmt(unpaidTotal),        icon: ReceiptText, color:'text-red-600'   },
    { label:'Order Hari Ini',      value: String(todayTrx.length), icon: ShoppingBag, color:'text-brand-600' },
    { label:'Total Pelanggan',     value: String(customers.length),icon: Users,       color:'text-purple-600'},
  ]

  async function doReset() {
    await resetTransactions()
    setConfirmReset(false)
  }

  return (
    <div className="flex min-h-screen pt-14 pb-16 md:pt-0 md:pb-0">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <button
            onClick={() => setConfirmReset(true)}
            className="btn btn-danger btn-sm text-xs"
          >
            <RotateCcw size={12}/> Reset Semua Transaksi
          </button>
        </div>

        {/* Confirm reset */}
        {confirmReset && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center justify-between">
            <p className="text-sm text-red-700 font-medium">
              ⚠ Yakin hapus SEMUA transaksi kasir? Data tidak bisa dikembalikan.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmReset(false)} className="btn-outline btn-sm">Batal</button>
              <button onClick={doReset} className="btn btn-danger btn-sm">Ya, Hapus Semua</button>
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {metrics.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-gray-500">{label}</p>
                <Icon size={16} className={color}/>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Unpaid invoices */}
        {unpaidInv.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium mb-3 text-red-600">⚠ Invoice Belum Lunas ({unpaidInv.length})</h2>
            <table className="data-table">
              <thead><tr><th>No. Invoice</th><th>Pelanggan</th><th>Jatuh Tempo</th><th>Total</th></tr></thead>
              <tbody>
                {unpaidInv.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-medium text-xs">{inv.id}</td>
                    <td>{inv.custName}</td>
                    <td className="text-xs text-gray-500">{inv.due.split('-').reverse().join('/')}</td>
                    <td className="font-medium text-brand-600">{fmt(inv.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Transaction history with delete */}
        <div>
          <h2 className="text-sm font-medium mb-3">Riwayat Transaksi Kasir</h2>
          <table className="data-table">
            <thead><tr>
              <th style={{minWidth:"160px"}}>No. Transaksi</th><th>Tanggal</th><th>Jam</th>
              <th>Item</th><th>Total</th><th>Metode</th><th>Aksi</th>
            </tr></thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada transaksi</td></tr>
              )}
              {transactions.map(t => (
                <tr key={t.id}>
                  <td className="font-medium text-xs tabular-nums whitespace-nowrap">{t.id}</td>
                  <td className="text-xs">{t.date}</td>
                  <td className="text-xs">{t.time}</td>
                  <td className="text-xs text-gray-500 max-w-xs truncate">{t.items}</td>
                  <td className="font-medium text-brand-600">{fmt(t.total)}</td>
                  <td><span className="badge badge-green">{t.method}</span></td>
                  <td>
                    <button
                      onClick={() => { if(confirm(`Hapus transaksi ${t.id}?`)) deleteTransaction(t.id).catch(console.error) }}
                      className="btn btn-danger btn-sm"
                    >
                      <Trash2 size={11}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
