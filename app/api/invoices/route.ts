import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { validateInvoice } from '@/lib/validate'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Map snake_case back to camelCase for frontend
  const mapped = (data ?? []).map(r => ({
    id:       r.id,
    custId:   r.cust_id,
    custName: r.cust_name,
    date:     r.date,
    due:      r.due,
    items:    r.items,
    total:    r.total,
    status:   r.status,
    note:     r.note,
  }))
  return NextResponse.json(mapped)
}

export async function POST(req: Request) {
  const supabase = createServerClient()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body bukan JSON yang valid' }, { status: 400 })
  }

  const v = validateInvoice(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const row = { ...v.value, note: (v.value.note as string) ?? '' }
  const { data, error } = await supabase
    .from('invoices')
    .insert(row)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
