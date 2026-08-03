import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

    // Ambil semua foto paket yang punya resi + nama
    const { data: fotos, error: fotosErr } = await supabase
      .from('foto_paket')
      .select('resi, nama, berat, photo_url')
      .neq('resi', '')
      .neq('nama', '')

    if (fotosErr) {
      return NextResponse.json({ error: fotosErr.message }, { status: 500 })
    }

    if (!fotos || fotos.length === 0) {
      return NextResponse.json({ success: true, updated: 0 })
    }

    // Untuk setiap foto, update rekap yang resi-nya cocok
    let updated = 0
    for (const foto of fotos) {
      const { data: rekap } = await supabase
        .from('rekap_paket')
        .select('id, nama')
        .ilike('resi', String(foto.resi).trim())
        .limit(1)

      if (rekap && rekap.length > 0) {
        const patch: Record<string, string> = { nama: foto.nama }
        if (foto.berat) patch.berat = foto.berat
        if (foto.photo_url) patch.photo_url = foto.photo_url
        const { error } = await supabase
          .from('rekap_paket')
          .update(patch)
          .eq('id', rekap[0].id)
        if (!error) updated++
      }
    }

    return NextResponse.json({ success: true, updated })
  } catch (err: any) {
    console.error('Sync rekap error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
