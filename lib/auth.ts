// ─── Role & hak akses (client-safe, tanpa rahasia) ──────────────
// Verifikasi kredensial ada di lib/auth-server.ts (server-only).
// Sesi dikelola via cookie httpOnly (lihat lib/session.ts + lib/auth-client.ts).

export type Role = 'kasir' | 'admin'

// Halaman yang hanya boleh diakses admin
export const ADMIN_ONLY_PATHS = [
  '/dashboard', '/inventory', '/modal', '/reports',
  '/import', '/migrate', '/spreadsheet',
]

export function canAccess(path: string, role: Role | null): boolean {
  if (!role) return false
  if (role === 'admin') return true
  return !ADMIN_ONLY_PATHS.some(p => path.startsWith(p))
}
