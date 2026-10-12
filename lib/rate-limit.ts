// ─── Rate limiter in-memory (best-effort) ───────────────────────
// Membatasi percobaan login (PIN 4 digit rawan brute-force).
// Catatan: pada deployment serverless multi-instance ini hanya
// pertahanan lapis pertama; tetap berguna untuk instance tunggal.

type Entry = { count: number; reset: number }
const buckets = new Map<string, Entry>()

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const e = buckets.get(key)
  if (!e || now > e.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  e.count++
  if (e.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((e.reset - now) / 1000)) }
  }
  return { ok: true, retryAfter: 0 }
}

export function resetLimit(key: string) {
  buckets.delete(key)
}

export function clientKey(req: Request, prefix: string): string {
  const fwd = req.headers.get('x-forwarded-for') || ''
  const ip = fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'local'
  return `${prefix}:${ip}`
}
