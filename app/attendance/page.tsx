'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { useStore } from '@/lib/store'
import { LogIn, LogOut } from 'lucide-react'

export default function AttendancePage() {
  const { attendanceLogs, addAttendance } = useStore()
  const [clock, setClock] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('id-ID'))
      setDateStr(now.toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const todayStr = new Date().toLocaleDateString('id-ID')
  const todayLogs = attendanceLogs.filter((l) => l.date === todayStr)
  const lastEntry = todayLogs[0]

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-xl font-semibold mb-6">Absensi</h1>

        <div className="max-w-lg flex flex-col gap-5">
          {/* Clock card */}
          <div className="card">
            <p className="text-5xl font-semibold text-brand-800 tracking-tight tabular-nums">
              {clock}
            </p>
            <p className="text-sm text-gray-500 mt-1">{dateStr}</p>

            {lastEntry && (
              <div className={`mt-4 text-xs px-3 py-2 rounded-lg inline-block ${
                lastEntry.type === 'Check In'
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                Terakhir: <span className="font-medium">{lastEntry.type}</span> pukul {lastEntry.time}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => addAttendance('Check In').catch(console.error)}
                className="btn-blue flex-1 py-3 text-base"
              >
                <LogIn size={16} /> Check In
              </button>
              <button
                onClick={() => addAttendance('Check Out').catch(console.error)}
                className="flex-1 py-3 text-base btn btn-outline border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <LogOut size={16} /> Check Out
              </button>
            </div>
          </div>

          {/* Today's log */}
          {todayLogs.length > 0 && (
            <div className="card">
              <p className="text-sm font-medium mb-3">Log Hari Ini</p>
              <div className="flex flex-col gap-0">
                {todayLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <span className={`badge ${log.type === 'Check In' ? 'badge-blue' : 'badge-amber'}`}>
                      {log.type}
                    </span>
                    <span className="text-sm text-gray-500">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full history */}
          {attendanceLogs.length > todayLogs.length && (
            <div className="card">
              <p className="text-sm font-medium mb-3">Riwayat Kehadiran</p>
              <table className="data-table">
                <thead><tr><th>Jenis</th><th>Tanggal</th><th>Jam</th></tr></thead>
                <tbody>
                  {attendanceLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span className={`badge ${log.type === 'Check In' ? 'badge-blue' : 'badge-amber'}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="text-sm">{log.date}</td>
                      <td className="text-sm text-gray-500">{log.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
