'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { verifyPin, verifyAdmin, setSession, isAuthenticated } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab]         = useState<'kasir' | 'admin'>('kasir')
  const [pin, setPin]         = useState('')
  const [user, setUser]       = useState('')
  const [pass, setPass]       = useState('')
  const [error, setError]     = useState('')
  const [shake, setShake]     = useState(false)
  const [showPass, setShowPass] = useState(false)
  const userRef = useRef<HTMLInputElement>(null)

  const PIN_LENGTH = (process.env.NEXT_PUBLIC_KASIR_PIN || '1234').length

  useEffect(() => {
    if (isAuthenticated()) router.replace('/')
  }, [router])

  useEffect(() => {
    if (tab === 'admin') setTimeout(() => userRef.current?.focus(), 100)
  }, [tab])

  // ── PIN handlers ──────────────────────────────────────
  function handlePinPress(val: string) {
    if (val === 'del') { setPin(p => p.slice(0, -1)); setError(''); return }
    if (pin.length >= PIN_LENGTH) return
    const next = pin + val
    setPin(next)
    setError('')
    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        if (verifyPin(next)) {
          setSession('kasir')
          router.replace('/')
        } else {
          triggerError('PIN salah, coba lagi')
          setTimeout(() => setPin(''), 500)
        }
      }, 100)
    }
  }

  // ── Admin handler ─────────────────────────────────────
  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    if (verifyAdmin(user.trim(), pass)) {
      setSession('admin')
      router.replace('/')
    } else {
      triggerError('Username atau password salah')
    }
  }

  function triggerError(msg: string) {
    setError(msg)
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','del']

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-brand-400 px-8 py-6 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Semesta POS
          </h1>
          <p className="text-brand-100 text-sm mt-0.5">Semesta Plastik</p>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-gray-200">
          {[
            { key: 'kasir', label: '🛒 Kasir' },
            { key: 'admin', label: '⚙️ Admin' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key as 'kasir' | 'admin'); setError(''); setPin('') }}
              className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                tab === key
                  ? 'border-brand-400 text-brand-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── KASIR PIN TAB ── */}
          {tab === 'kasir' && (
            <div>
              <p className="text-center text-sm text-gray-500 mb-5">
                Masukkan PIN kasir
              </p>

              {/* PIN dots */}
              <div className={`flex justify-center gap-3 mb-2 ${shake ? 'animate-bounce' : ''}`}>
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
                    i < pin.length
                      ? 'bg-brand-400 border-brand-400 scale-110'
                      : 'border-gray-300'
                  }`}/>
                ))}
              </div>

              <p className={`text-center text-sm mb-4 h-4 ${error ? 'text-red-500' : 'text-transparent'}`}>
                {error || '.'}
              </p>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2.5">
                {keys.map((key, i) => {
                  if (key === '') return <div key={i}/>
                  return (
                    <button
                      key={i}
                      onClick={() => handlePinPress(key)}
                      className={`h-14 rounded-xl text-lg font-medium transition-all active:scale-95 select-none ${
                        key === 'del'
                          ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          : 'bg-gray-50 text-gray-900 hover:bg-brand-50 hover:text-brand-700 border border-gray-200 hover:border-brand-300'
                      }`}
                    >
                      {key === 'del' ? '⌫' : key}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── ADMIN TAB ── */}
          {tab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
              <p className="text-center text-sm text-gray-500">
                Login sebagai administrator
              </p>

              <div className={shake ? 'animate-bounce' : ''}>
                <label className="text-xs text-gray-500 block mb-1.5">Username</label>
                <input
                  ref={userRef}
                  className="input"
                  value={user}
                  onChange={e => { setUser(e.target.value); setError('') }}
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPass ? 'text' : 'password'}
                    value={pass}
                    onChange={e => { setPass(e.target.value); setError('') }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={!user || !pass}
                className="btn-blue py-3 mt-1"
              >
                Masuk sebagai Admin
              </button>
            </form>
          )}
        </div>

        <div className="px-6 pb-5 text-center text-xs text-gray-300">
          Semesta POS v1.2.0
        </div>
      </div>
    </div>
  )
}
