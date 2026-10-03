import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_ONLY = ['/dashboard', '/inventory', '/modal', '/reports', '/import', '/migrate']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/login'))   return NextResponse.next()
  if (pathname.startsWith('/api'))     return NextResponse.next()
  if (pathname.startsWith('/_next'))   return NextResponse.next()
  if (pathname === '/favicon.ico')     return NextResponse.next()

  const role = request.cookies.get('semesta-auth')?.value

  // Not logged in
  if (!role || !['kasir','admin'].includes(role)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Kasir blocked from admin pages
  if (role === 'kasir' && ADMIN_ONLY.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
