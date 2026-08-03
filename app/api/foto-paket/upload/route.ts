import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { imageDataUrl, ekspedisi, resi, berat, nama } = await request.json()

    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

    const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '')
    const buf = Buffer.from(base64, 'base64')

    const fileName = `paket-${Date.now()}.jpg`
    const filePath = `foto-paket/${fileName}`

    const { error: upErr } = await supabase.storage
      .from('semesta-pos')
      .upload(filePath, buf, { contentType: 'image/jpeg', upsert: false })

    if (upErr) {
      console.error('Upload error:', upErr)
      return NextResponse.json({ error: 'Gagal upload: ' + upErr.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('semesta-pos')
      .getPublicUrl(filePath)

    // Simpan metadata ke tabel foto_paket
    const { error: insErr } = await supabase
      .from('foto_paket')
      .insert({ resi: resi || '', nama: nama || '', berat: berat || '', ekspedisi: ekspedisi || '', photo_url: publicUrl })

    if (insErr) {
      console.error('Insert error:', insErr)
      return NextResponse.json({ error: 'Gagal simpan data: ' + insErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: publicUrl, path: filePath })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
