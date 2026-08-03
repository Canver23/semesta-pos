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

    const rows = items.map(it => ({
      courier: it.courier || '',
      resi: it.resi || '',
      nama: it.nama || '',
      marketplace: it.marketplace || 'TP',
    })).filter(it => it.nama || it.resi)

    // Upsert per resi: update yang sudah ada, insert yang baru.
    // Nama yang sudah di-update dari foto (via resi) tidak akan hilang.
    let saved = 0
    for (const row of rows) {
      if (row.resi) {
        const { data: existing } = await supabase
          .from('rekap_paket')
          .select('id')
          .eq('resi', row.resi)
          .limit(1)
        if (existing && existing.length > 0) {
          const { error } = await supabase
            .from('rekap_paket')
            .update(row)
            .eq('id', existing[0].id)
          if (!error) saved++
        } else {
          const { error } = await supabase.from('rekap_paket').insert(row)
          if (!error) saved++
        }
      } else {
        const { error } = await supabase.from('rekap_paket').insert(row)
        if (!error) saved++
      }
    }

    return NextResponse.json({ success: true, count: saved })
  } catch (err: any) {
    console.error('Save rekap error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
