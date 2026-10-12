'use client'

// ─── Client-side session (role dibaca dari server, bukan dari cookie) ──
// Cookie sesi bersifat httpOnly sehingga tidak bisa dibaca JavaScript;
// identitas diambil via /api/auth/session.

export type Role = 'kasir' | 'admin'

export interface ClientSession {
  role: Role
  name: string
}

let cache: ClientSession | null = null
let cacheLoaded = false

export async function fetchSession(): Promise<ClientSession | null> {
  try {
    const res = await fetch('/api/auth/session', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data.session ?? null
  } catch {
    return null
  }
}

export async function getSession(force = false): Promise<ClientSession | null> {
  if (cacheLoaded && !force) return cache
  cache = await fetchSession()
  cacheLoaded = true
  return cache
}

export async function loginKasir(pin: string): Promise<{ ok: boolean; error?: string }> {
  return doLogin({ mode: 'kasir', pin })
}

export async function loginAdmin(user: string, pass: string): Promise<{ ok: boolean; error?: string }> {
  return doLogin({ mode: 'admin', user, pass })
}

async function doLogin(body: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      cacheLoaded = false
      return { ok: true }
    }
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.error ?? 'Login gagal' }
  } catch {
    return { ok: false, error: 'Tidak dapat menghubungi server' }
  }
}

export async function logout() {
  cache = null
  cacheLoaded = false
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    /* abaikan */
  }
}
