// ─── Server-only credential verification ────────────────────────
// Kredensial HANYA dibaca di server (tanpa prefix NEXT_PUBLIC_),
// sehingga tidak pernah ikut ter-bundle ke browser.

function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

/**
 * Ambil nilai env. Di production nilai WAJIB diset — tidak ada fallback
 * (mencegah admin/admin123 / PIN 1234 ikut ter-deploy).
 * Di development, fallback dipakai agar mudah dicoba.
 */
function envOrDev(name: string, devDefault: string): string {
  const v = process.env[name]
  if (v && v.length > 0) return v
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[auth] ${name} belum diset di production — login akan selalu ditolak.`)
    return ''
  }
  return devDefault
}

export function verifyPin(pin: string): boolean {
  const expected = envOrDev('KASIR_PIN', '1234')
  if (!expected) return false
  return safeEqual(pin, expected)
}

export function verifyAdmin(user: string, pass: string): boolean {
  const expectedUser = envOrDev('ADMIN_USER', 'admin')
  const expectedPass = envOrDev('ADMIN_PASS', 'admin123')
  if (!expectedUser || !expectedPass) return false
  const okUser = safeEqual(user, expectedUser)
  const okPass = safeEqual(pass, expectedPass)
  return okUser && okPass
}

/** Panjang PIN untuk UI numpad (bukan rahasia). */
export function pinLength(): number {
  const v = process.env.KASIR_PIN
  if (v && v.length > 0) return v.length
  return 4
}
