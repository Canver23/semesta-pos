import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = await verifySessionToken(token)
  if (!session) {
    return NextResponse.json({ session: null }, { status: 200 })
  }
  return NextResponse.json({ session: { role: session.role, name: session.name } })
}
