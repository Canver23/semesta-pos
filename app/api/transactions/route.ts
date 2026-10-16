import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session'
import { validateTransaction } from '@/lib/validate'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = createServerClient()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body bukan JSON yang valid' }, { status: 400 })
  }

  const v = validateTransaction(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const { data, error } = await supabase
    .from('transactions')
    .insert(v.value)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── Reset SEMUA transaksi ──────────────────────────────────────
// Berbahaya: menghapus seluruh riwayat penjualan tanpa bisa dikembalikan.
// Selain dijaga middleware, endpoint ini memeriksa sendiri bahwa
// pemanggilnya benar-benar admin (pertahanan berlapis).
export async function DELETE() {
  // Pertahanan berlapis: jangan hanya bergantung pada middleware.
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = await verifySessionToken(token)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak — hanya admin' }, { status: 403 })
  }

  // Reset semua transaksi
  const supabase = createServerClient()
  const { error } = await supabase
    .from('transactions')
    .delete()
    .neq('id', '')   // delete all
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
