import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session'

// Halaman yang hanya boleh diakses admin
const ADMIN_ONLY_PAGES = [
  '/dashboard', '/inventory', '/modal', '/reports',
  '/import', '/migrate', '/spreadsheet',
]

// Prefix API yang hanya boleh diakses admin
const ADMIN_ONLY_API = [
  '/api/products', '/api/customers', '/api/categories',
  '/api/invoices', '/api/migrate', '/api/spreadsheet',
]

// Prefix API yang boleh diakses kasir maupun admin
const KASIR_API = [
  '/api/transactions', '/api/attendance',
  '/api/rekap', '/api/foto-paket',
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

    const isAdminApi = ADMIN_ONLY_API.some(p => pathname.startsWith(p))
    const isKasirApi = KASIR_API.some(p => pathname.startsWith(p))

    if (isAdminApi && session.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    // Endpoint API tak dikenal: hanya admin
    if (!isAdminApi && !isKasirApi && session.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    return NextResponse.next()
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
