import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Pages that don't need auth
const PUBLIC_PATHS = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth for public paths and API routes
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.startsWith('/api')) return NextResponse.next()
  if (pathname.startsWith('/_next')) return NextResponse.next()

  // Check auth via cookie (set by client after PIN)
  const auth = request.cookies.get('semesta-auth')
  if (!auth || auth.value !== 'ok') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
