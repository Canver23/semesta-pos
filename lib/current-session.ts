import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE, type SessionPayload } from './session'

/**
 * Sesi saat ini di dalam Route Handler / Server Component (Node runtime).
 * Dipakai untuk memutuskan hal yang TIDAK bisa dilakukan middleware sendiri,
 * mis. menghapus field `cost` dari data produk untuk role kasir.
 */
export async function currentSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return verifySessionToken(token)
}
