import { NextResponse } from 'next/server'
import { pinLength } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// Info non-rahasia untuk UI login (jumlah digit PIN).
export async function GET() {
  return NextResponse.json({ pinLength: pinLength() })
}
