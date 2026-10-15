'use client'
import { useEffect, useState } from 'react'
import { getSession, type Role } from './auth-client'

/**
 * Role sesi saat ini di komponen klien.
 * `null` = belum diketahui (masih dimuat) — jangan pakai untuk menyembunyikan
 * kontrol yang aksinya bisa dieksekusi; pakai hanya untuk menyembunyikan
 * tombol yang PASTI ditolak server (mis. tombol Hapus untuk kasir).
 */
export function useRole(): Role | null {
  const [role, setRole] = useState<Role | null>(null)
  useEffect(() => {
    getSession().then(s => setRole(s?.role ?? null))
  }, [])
  return role
}
