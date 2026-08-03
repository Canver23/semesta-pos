import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // Mask key untuk keamanan
  const maskedKey = supabaseKey ? supabaseKey.substring(0, 10) + '...' : '(kosong)'

  const info = {
    supabaseUrl,
    supabaseKeyLen: supabaseKey.length,
    maskedKey,
    test: null as any,
  }

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    const { data, error } = await supabase.from('rekap_paket').select('*').limit(5)
    info.test = { rows: data?.length ?? 0, error: error?.message || null, sample: data?.slice(0, 2) || [] }
  }

  return NextResponse.json(info)
}

export const dynamic = 'force-dynamic'
