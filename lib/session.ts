// ─── Signed session token (Edge + Node compatible) ──────────────
// Token = base64url(payload).base64url(HMAC-SHA256(payload, AUTH_SECRET))
// Diverifikasi di middleware (edge) dan di API route (node).

export const SESSION_COOKIE = 'semesta-session'
export const SESSION_DURATION_MS = 10 * 60 * 60 * 1000 // 10 jam

export type Role = 'kasir' | 'admin'

export interface SessionPayload {
  role: Role
  name: string
  exp: number // epoch ms
}

// ─── base64url helpers ─────────────────────────────────────────
function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// ─── Secret ────────────────────────────────────────────────────
function getSecret(): string {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 16) {
    throw new Error('AUTH_SECRET belum diset (minimal 16 karakter). Lihat .env.example')
  }
  return s
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return b64urlEncode(new Uint8Array(sig))
}

function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

// ─── Create / verify ───────────────────────────────────────────
export async function createSessionToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  const full: SessionPayload = { ...payload, exp: Date.now() + SESSION_DURATION_MS }
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(full)))
  const sig = await hmac(body, getSecret())
  return `${body}.${sig}`
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts

  let expected: string
  try {
    expected = await hmac(body, getSecret())
  } catch {
    // AUTH_SECRET tidak ada → anggap tidak terautentikasi
    return null
  }
  if (!safeEqual(sig, expected)) return null

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as SessionPayload
    if (!payload || typeof payload.exp !== 'number') return null
    if (Date.now() > payload.exp) return null
    if (payload.role !== 'kasir' && payload.role !== 'admin') return null
    return payload
  } catch {
    return null
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  }
}
