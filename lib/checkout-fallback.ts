import { type createServerClient } from '@/lib/supabase'
import type { CheckoutLine } from '@/lib/validate'

type Supabase = ReturnType<typeof createServerClient>
type ProductRow = { id: number; name: string; stock: number; variants?: { id: string; name: string; stock: number }[] }
export type CheckoutTx = {
  id: string; date: string; time: string; items: string
  total: number; cash: number; change: number; method: string
}
export type CheckoutResult = { transaction: unknown; products: unknown[] }

/**
 * Error Postgres/PostgREST yang berarti "fungsi checkout belum ada di DB".
 * Dipakai untuk jatuh ke jalur cadangan alih-alih menggagalkan penjualan.
 */
export function isMissingFunction(message: string, code?: string): boolean {
  return code === 'PGRST202' ||
    /could not find the function|function .* does not exist|schema cache/i.test(message)
}

/**
 * Jalur cadangan bila fungsi SQL `checkout` (supabase-checkout-fn.sql) belum
 * dijalankan di Supabase, supaya POS tidak mati total.
 *
 * Fase 1 memeriksa SEMUA stok lebih dulu dan tidak menulis apa pun sebelum
 * semuanya valid. Fase 2 baru menulis (catat penjualan, lalu potong stok
 * dengan compare-and-set); setiap kegagalan membatalkan tulisan sebelumnya.
 *
 * Ini tetap lebih lemah daripada fungsi SQL (tidak ada kunci baris sejati),
 * jadi fungsi `checkout` tetap wajib dijalankan agar benar-benar atomik.
 */
export async function fallbackCheckout(
  supabase: Supabase,
  tx: CheckoutTx,
  lines: CheckoutLine[],
): Promise<{ ok: true; data: CheckoutResult } | { ok: false; status: number; error: string }> {
  const ids = Array.from(new Set(lines.map(l => l.id)))
  const { data: rows, error: readErr } = await supabase
    .from('products')
    .select('id,name,stock,variants')
    .in('id', ids)
  if (readErr) return { ok: false, status: 500, error: readErr.message }

  const prods = (rows ?? []) as ProductRow[]
  const perProduk = new Map<number, { qty: number; varQty: Map<string, number> }>()

  // ── Fase 1: periksa semua dulu ──────────────────────────────────
  for (const line of lines) {
    const p = prods.find(x => x.id === line.id)
    if (!p) return { ok: false, status: 409, error: `Produk ${line.id} tidak ditemukan` }

    const acc = perProduk.get(line.id) ?? { qty: 0, varQty: new Map<string, number>() }
    const pakaiVarian = !!(line.variant && p.variants && p.variants.length)

    if (pakaiVarian) {
      const v = p.variants!.find(x => x.id === line.variant)
      if (!v) return { ok: false, status: 409, error: `Varian ${line.variant} pada ${p.name} tidak ditemukan` }
      const diminta = (acc.varQty.get(line.variant!) ?? 0) + line.qty
      if (diminta > v.stock) {
        return { ok: false, status: 409,
          error: `Stok varian ${v.name} pada ${p.name} tidak cukup (tersedia ${v.stock}, diminta ${diminta})` }
      }
      acc.varQty.set(line.variant!, diminta)
    } else {
      acc.qty += line.qty
    }
    perProduk.set(line.id, acc)
  }
  for (const [id, acc] of perProduk) {
    const p = prods.find(x => x.id === id)!
    if (acc.qty > p.stock) {
      return { ok: false, status: 409,
        error: `Stok ${p.name} tidak cukup (tersedia ${p.stock}, diminta ${acc.qty})` }
    }
  }

  // ── Fase 2: catat penjualan, lalu potong stok ───────────────────
  const { error: insErr } = await supabase.from('transactions').insert(tx)
  if (insErr) return { ok: false, status: 500, error: insErr.message }

  const diterapkan: { id: number; stock: number; variants?: ProductRow['variants'] }[] = []
  const rollback = async () => {
    for (const d of diterapkan) {
      await supabase.from('products').update({ stock: d.stock, variants: d.variants }).eq('id', d.id)
    }
    await supabase.from('transactions').delete().eq('id', tx.id)
  }

  const terbaru: unknown[] = []
  for (const [id, acc] of perProduk) {
    const p = prods.find(x => x.id === id)!
    const stokBaru = Math.max(0, p.stock - acc.qty)
    let varianBaru = p.variants
    if (acc.varQty.size && p.variants) {
      varianBaru = p.variants.map(v => {
        const potong = acc.varQty.get(v.id)
        return potong ? { ...v, stock: Math.max(0, v.stock - potong) } : v
      })
    }

    // Baca ulang baris tepat sebelum menulis: bila kasir lain sudah mengubah
    // stok/varian sejak kita memeriksa di Fase 1, batalkan semuanya alih-alih
    // menimpa nilainya.
    const { data: kini } = await supabase
      .from('products')
      .select('id,stock,variants')
      .eq('id', id)
      .maybeSingle()
    const pKini = kini as ProductRow | null
    const berubah = !pKini ||
      Number(pKini.stock) !== p.stock ||
      (JSON.stringify(pKini.variants ?? []) !== JSON.stringify(p.variants ?? []))
    if (berubah) {
      await rollback()
      return { ok: false, status: 409,
        error: `Stok ${p.name} berubah saat transaksi diproses. Silakan ulangi.` }
    }

    // Compare-and-set pada stok: update hanya mengenai baris bila stok masih
    // sama seperti saat dibaca.
    const { data: kena, error: updErr } = await supabase
      .from('products')
      .update({ stock: stokBaru, variants: varianBaru })
      .eq('id', id)
      .eq('stock', p.stock)
      .select('id,stock,variants')

    if (updErr || !kena || kena.length === 0) {
      await rollback()
      return { ok: false, status: 409,
        error: `Stok ${p.name} berubah saat transaksi diproses. Silakan ulangi.` }
    }
    diterapkan.push({ id, stock: p.stock, variants: p.variants })
    terbaru.push({ id, name: p.name, stock: stokBaru, variants: varianBaru })
  }

  return { ok: true, data: { transaction: tx, products: terbaru } }
}
