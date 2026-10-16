import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session'

// Halaman yang hanya boleh diakses admin
const ADMIN_ONLY_PAGES = [
  '/dashboard', '/reports',
  '/import', '/migrate', '/spreadsheet',
]

// API yang HANYA boleh diakses admin (semua method)
const ADMIN_ONLY_API = [
  '/api/migrate', '/api/spreadsheet',
]

// API yang boleh diakses kasir maupun admin (semua method)
// Pelanggan & Invoice memang dipakai kasir untuk melayani pembeli, jadi
// keduanya boleh dibaca DAN diubah kasir (hapus tetap dibatasi di halaman).
const KASIR_API = [
  '/api/transactions', '/api/attendance',
  '/api/rekap', '/api/foto-paket',
  '/api/customers', '/api/invoices',
  '/api/checkout',
]

// Produk & kategori: kasir boleh baca DAN tambah/ubah (dipakai halaman
// Inventori & Harga Modal, plus update stok saat checkout). HAPUS tetap hak
// admin supaya data produk tidak bisa dihilangkan dari akun kasir.
const KASIR_STOK_API = [
  '/api/products', '/api/categories',
]

function isPublicApi(pathname: string): boolean {
  return pathname.startsWith('/api/auth/')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── API: wajib sesi valid ────────────────────────────────────
  if (pathname.startsWith('/api')) {
    if (isPublicApi(pathname)) return NextResponse.next()

    const token = request.cookies.get(SESSION_COOKIE)?.value
    const session = await verifySessionToken(token)

    if (!session) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    // Admin boleh mengakses semua endpoint
    if (session.role === 'admin') return NextResponse.next()

    // ── Kasir: hanya endpoint yang diizinkan ──────────────────
    const method = request.method.toUpperCase()
    const isAdminApi  = ADMIN_ONLY_API.some(p => pathname.startsWith(p))
    const isKasirApi  = KASIR_API.some(p => pathname.startsWith(p))
    const isStokApi   = KASIR_STOK_API.some(p => pathname.startsWith(p))

    // Kasir tidak boleh reset/hapus data transaksi (endpoint DELETE)
    if (pathname.startsWith('/api/transactions') && method === 'DELETE') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    // Kasir boleh lihat + tambah/ubah Pelanggan & Invoice, TAPI tidak
    // boleh menghapus (hapus tetap hak admin).
    if (method === 'DELETE' &&
        (pathname.startsWith('/api/customers') || pathname.startsWith('/api/invoices'))) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    if (isAdminApi) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    if (isKasirApi) return NextResponse.next()

    // Kasir boleh lihat + tambah/ubah produk & kategori (Inventori/Harga Modal)
    if (isStokApi && method !== 'DELETE') return NextResponse.next()

    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  // ── Halaman: redirect ke /login bila belum login ─────────────
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = await verifySessionToken(token)

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session.role === 'kasir' && ADMIN_ONLY_PAGES.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
