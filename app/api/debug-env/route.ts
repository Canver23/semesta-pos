import { NextResponse } from 'next/server'

// Endpoint debug HANYA aktif di mode development.
// Di production mengembalikan 404 agar tidak membocorkan konfigurasi.
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const maskedKey = supabaseKey ? supabaseKey.substring(0, 10) + '...' : '(kosong)'

  return NextResponse.json({
    supabaseUrl,
    supabaseKeyLen: supabaseKey.length,
    maskedKey,
  })
}

export const dynamic = 'force-dynamic'
