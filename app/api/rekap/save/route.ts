import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body as { items: { courier: string; resi: string; nama: string; marketplace: string }[] }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

    // Simpan semua item rekap (upsert per resi)
    const rows = items.map(it => ({
      courier: it.courier || '',
      resi: it.resi || '',
      nama: it.nama || '',
      marketplace: it.marketplace || 'TP',
    })).filter(it => it.nama || it.resi)

    const { error } = await supabase.from('rekap_paket').insert(rows)
    if (error) {
      console.error('Save rekap error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch (err: any) {
    console.error('Save rekap error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
