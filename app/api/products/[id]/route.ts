import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { validateProduct } from '@/lib/validate'
import type { Product } from '@/lib/types'

// Map DB row (snake_case) → frontend Product (camelCase)
function mapProduct(row: Record<string, unknown>): Product {
  return {
    id:             row.id as number,
    name:           row.name as string,
    category:       row.category as string,
    size:           row.size as string,
    unit:           row.unit as string,
    price:          row.price as number,
    cost:           (row.cost as number) ?? 0,
    stock:          row.stock as number,
    bestseller:     row.bestseller as boolean,
    priceWholesale: (row.price_wholesale as number) ?? 0,
    unitWholesale:  (row.unit_wholesale  as string) ?? '',
    qtyWholesale:   (row.qty_wholesale   as number) ?? 0,
    variants:       (row.variants as Product['variants']) ?? [],
  }
}

function toDbRow(p: Partial<Product>) {
  const row: Record<string, unknown> = {}
  if (p.name           !== undefined) row.name            = p.name
  if (p.category       !== undefined) row.category        = p.category
  if (p.size           !== undefined) row.size            = p.size
  if (p.unit           !== undefined) row.unit            = p.unit
  if (p.price          !== undefined) row.price           = p.price
  if (p.cost           !== undefined) row.cost            = p.cost
  if (p.stock          !== undefined) row.stock           = p.stock
  if (p.bestseller     !== undefined) row.bestseller      = p.bestseller
  if (p.priceWholesale !== undefined) row.price_wholesale = p.priceWholesale
  if (p.unitWholesale  !== undefined) row.unit_wholesale  = p.unitWholesale
  if (p.qtyWholesale   !== undefined) row.qty_wholesale   = p.qtyWholesale
  if (p.variants       !== undefined) row.variants        = p.variants
  return row
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id } = await params

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'ID produk tidak valid' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body bukan JSON yang valid' }, { status: 400 })
  }

  const v = validateProduct(body, true)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const row = toDbRow(v.value)
  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: 'Tidak ada field yang diubah' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('products')
    .update(row)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapProduct(data))
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id } = await params
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
