'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// PIN disimpan di env variable atau default
// Set NEXT_PUBLIC_APP_PIN di Vercel environment variables
const CORRECT_PIN = process.env.NEXT_PUBLIC_APP_PIN || '1234'
const SESSION_KEY = 'semesta-pos-auth'
const SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 jam

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return false
  try {
    const { expiry } = JSON.parse(raw)
    return Date.now() < expiry
  } catch {
    return false
  }
}

export function setAuthenticated() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    auth: true,
    expiry: Date.now() + SESSION_DURATION,
  }))
  // Set cookie for middleware (expires in 8 hours)
  const expires = new Date(Date.now() + SESSION_DURATION).toUTCString()
  document.cookie = `semesta-auth=ok; expires=${expires}; path=/; SameSite=Strict`
}

export function clearAuth() {
  sessionStorage.removeItem(SESSION_KEY)
  document.cookie = 'semesta-auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
}

export default function LoginPage() {
  const router = useRouter()
  const [pin, setPin]       = useState('')
  const [error, setError]   = useState('')
  const [shake, setShake]   = useState(false)

  useEffect(() => {
    if (isAuthenticated()) router.replace('/')
  }, [router])

  function handlePress(val: string) {
    if (val === 'del') {
      setPin(p => p.slice(0, -1))
      setError('')
      return
    }
    if (pin.length >= 6) return
    const next = pin + val
    setPin(next)
    setError('')

    // Auto-check when PIN length matches
    if (next.length === CORRECT_PIN.length) {
      setTimeout(() => {
        if (next === CORRECT_PIN) {
          setAuthenticated()
          router.replace('/')
        } else {
          setShake(true)
          setError('PIN salah, coba lagi')
          setTimeout(() => { setPin(''); setShake(false) }, 600)
        }
      }, 100)
    }
  }

  const dots = Array.from({ length: CORRECT_PIN.length }).map((_, i) => (
    <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
      i < pin.length ? 'bg-brand-400 border-brand-400' : 'border-gray-300'
    }`}/>
  ))

  const keys = ['1','2','3','4','5','6','7','8','9','','0','del']

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-xs shadow-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-brand-600">
            Semesta <span className="text-brand-400">POS</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">Semesta Plastik</p>
        </div>

        {/* PIN dots */}
        <div className={`flex justify-center gap-3 mb-3 transition-all ${shake ? 'animate-bounce' : ''}`}>
          {dots}
        </div>

        {/* Error */}
        <p className={`text-center text-sm mb-5 h-5 transition-all ${
          error ? 'text-red-500' : 'text-transparent'
        }`}>{error || '.'}</p>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((key, i) => {
            if (key === '') return <div key={i}/>
            return (
              <button
                key={i}
                onClick={() => handlePress(key)}
                disabled={key !== 'del' && pin.length >= CORRECT_PIN.length}
                className={`
                  h-14 rounded-xl text-lg font-medium transition-all active:scale-95
                  ${key === 'del'
                    ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 text-sm'
                    : 'bg-gray-50 text-gray-900 hover:bg-brand-50 hover:text-brand-700 border border-gray-200'
                  }
                  disabled:opacity-40
                `}
              >
                {key === 'del' ? '⌫' : key}
              </button>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Masukkan PIN untuk masuk
        </p>
      </div>
    </div>
  )
}
