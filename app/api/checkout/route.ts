import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { validateCheckout } from '@/lib/validate'
import { generateTrxId } from '@/lib/utils'
import { fallbackCheckout, isMissingFunction } from '@/lib/checkout-fallback'

// ─── Checkout atomik (Prioritas 2: Integritas Data) ─────────────
// Sebelumnya checkout dilakukan dari browser dengan urutan:
//   1. POST /api/transactions   (catat penjualan)
//   2. PUT  /api/products/N     (kurangi stok) — diulang untuk tiap produk
// Bila langkah 2 gagal di tengah (jaringan putus, tab ditutup, stok sudah
// diubah kasir lain), penjualan SUDAH tercatat tapi stok TIDAK berkurang,
// dan dua kasir yang menjual barang terakhir bisa membuat stok minus.
//
// Sekarang seluruh checkout dikerjakan di server dalam SATU transaksi
// database lewat fungsi `checkout` (supabase-checkout-fn.sql): baris produk
// dikunci, stok diperiksa, dikurangi, lalu penjualan dicatat — berhasil
// semua atau batal semua. Bila fungsi SQL itu belum dijalankan, jalur
// cadangan di lib/checkout-fallback.ts dipakai agar POS tetap jalan.
export async function POST(req: Request) {
  const supabase = createServerClient()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body bukan JSON yang valid' }, { status: 400 })
  }

  const v = validateCheckout(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const { items, cash, method } = v.value
  const now = new Date()

  // Nomor transaksi: berbasis jumlah transaksi hari ini (sama seperti
  // sebelumnya). Bila ID sudah terpakai, ulangi dengan nomor berikutnya.
  const dateStr = now.toLocaleDateString('id-ID')
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('date', dateStr)

  const itemsText = items.map(i => `${i.name} ×${i.qty}`).join(', ')

  let lastErr = ''
  let result: { transaction: unknown; products: unknown[] } | null = null

  for (let attempt = 0; attempt < 5 && !result; attempt++) {
    const trxId = generateTrxId((count ?? 0) + attempt, now)
    const total = items.reduce((s, i) => s + Math.round(i.price * i.qty), 0)

    const { data, error } = await supabase.rpc('checkout', {
      p_tx_id:      trxId,
      p_date:       dateStr,
      p_time:       timeStr,
      p_items_text: itemsText,
      p_total:      total,
      p_cash:       Math.round(cash),
      p_change:     Math.round(cash - total),
      p_method:     method,
      // Harga TIDAK dikirim dari klien sebagai sumber kebenaran; server tetap
      // memakai harga yang dikirim karena harga khusus pelanggan dipilih di UI.
      p_items:      items.map(i => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit, variant: i.variant ?? '' })),
    })

    if (!error) {
      result = data as { transaction: unknown; products: unknown[] }
      break
    }
    lastErr = error.message

    // Fungsi SQL belum dijalankan → pakai jalur cadangan (sekali saja)
    if (isMissingFunction(error.message, (error as { code?: string }).code)) {
      console.warn('[checkout] fungsi `checkout` belum ada di database — memakai jalur cadangan. ' +
        'Jalankan supabase-checkout-fn.sql agar checkout benar-benar atomik.')
      const fb = await fallbackCheckout(supabase, {
        id: trxId, date: dateStr, time: timeStr, items: itemsText,
        total, cash: Math.round(cash), change: Math.round(cash - total), method,
      }, items)
      if (fb.ok) { result = fb.data; break }
      return NextResponse.json({ error: fb.error }, { status: fb.status })
    }

    // Nomor transaksi bentrok → coba nomor berikutnya
    if (!/duplicate key|sudah ada|unique/i.test(error.message)) break
  }

  if (!result) {
    // Pesan "stok tidak cukup" dikirim apa adanya supaya kasir tahu sebabnya
    const status = /tidak cukup|kosong|tidak ditemukan|tidak valid|berubah/i.test(lastErr) ? 409 : 500
    return NextResponse.json({ error: lastErr || 'Checkout gagal' }, { status })
  }

  return NextResponse.json(result)
}
