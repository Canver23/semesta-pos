import { NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, type Role } from '@/lib/session'
import { verifyPin, verifyAdmin } from '@/lib/auth-server'
import { rateLimit, resetLimit, clientKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let body: { mode?: string; pin?: string; user?: string; pass?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }

  const mode = body.mode
  if (mode !== 'kasir' && mode !== 'admin') {
    return NextResponse.json({ error: 'Mode login tidak dikenal' }, { status: 400 })
  }

  // Batasi percobaan login: 8x per 5 menit per IP per mode
  const key = clientKey(req, `login:${mode}`)
  const limit = rateLimit(key, 8, 5 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfter} detik.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let role: Role | null = null
  let name = ''

  if (mode === 'kasir') {
    if (typeof body.pin !== 'string' || !verifyPin(body.pin)) {
      return NextResponse.json({ error: 'PIN salah, coba lagi' }, { status: 401 })
    }
    role = 'kasir'
    name = 'Kasir'
  } else {
    const user = (body.user ?? '').trim()
    const pass = body.pass ?? ''
    if (!verifyAdmin(user, pass)) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
    }
    role = 'admin'
    name = user
  }

  let token: string
  try {
    token = await createSessionToken({ role, name })
  } catch (e) {
    console.error('[auth] gagal membuat sesi:', e)
    return NextResponse.json({ error: 'Konfigurasi server belum lengkap (AUTH_SECRET)' }, { status: 500 })
  }

  resetLimit(key)

  const res = NextResponse.json({ ok: true, session: { role, name } })
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  return res
}
