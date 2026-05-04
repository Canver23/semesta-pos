// ─── Auth config (set via Vercel ENV) ────────────────────────
// NEXT_PUBLIC_KASIR_PIN      = PIN kasir (default: 1234)
// NEXT_PUBLIC_ADMIN_USER     = username admin (default: admin)
// NEXT_PUBLIC_ADMIN_PASS     = password admin (default: admin123)

export type Role = 'kasir' | 'admin'

const KASIR_PIN   = process.env.NEXT_PUBLIC_KASIR_PIN   || '1234'
const ADMIN_USER  = process.env.NEXT_PUBLIC_ADMIN_USER  || 'admin'
const ADMIN_PASS  = process.env.NEXT_PUBLIC_ADMIN_PASS  || 'admin123'

const SESSION_KEY      = 'semesta-pos-session'
const SESSION_DURATION = 10 * 60 * 60 * 1000 // 10 jam

export interface Session {
  role: Role
  name: string
  expiry: number
}

// ─── Verify credentials ───────────────────────────────────────
export function verifyPin(pin: string): boolean {
  return pin === KASIR_PIN
}

export function verifyAdmin(user: string, pass: string): boolean {
  return user === ADMIN_USER && pass === ADMIN_PASS
}

// ─── Session management ───────────────────────────────────────
export function setSession(role: Role) {
  const name    = role === 'admin' ? ADMIN_USER : 'Kasir'
  const session: Session = { role, name, expiry: Date.now() + SESSION_DURATION }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  const expires = new Date(session.expiry).toUTCString()
  document.cookie = `semesta-auth=${role}; expires=${expires}; path=/; SameSite=Strict`
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s: Session = JSON.parse(raw)
    if (Date.now() > s.expiry) { clearSession(); return null }
    return s
  } catch { return null }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  document.cookie = 'semesta-auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}

export function getRole(): Role | null {
  return getSession()?.role ?? null
}

// ─── Role permissions ─────────────────────────────────────────
// Kasir: kasir + invoice + pelanggan + absensi
// Admin: semua halaman
export const ADMIN_ONLY_PATHS = [
  '/dashboard', '/inventory', '/reports', '/import', '/migrate',
]

export function canAccess(path: string, role: Role | null): boolean {
  if (!role) return false
  if (role === 'admin') return true
  return !ADMIN_ONLY_PATHS.some(p => path.startsWith(p))
}
