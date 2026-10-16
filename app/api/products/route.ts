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

// Map frontend Product → DB row (snake_case)
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

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map(r => mapProduct(r)))
}

export async function POST(req: Request) {
  const supabase = createServerClient()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body bukan JSON yang valid' }, { status: 400 })
  }

  const v = validateProduct(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const row = toDbRow(v.value)
  const { data, error } = await supabase
    .from('products')
    .insert(row)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapProduct(data))
}
