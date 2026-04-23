import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
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
  const body = await req.json()
  const row = {
    id:        body.id,
    cust_id:   body.custId,
    cust_name: body.custName,
    date:      body.date,
    due:       body.due,
    items:     body.items,
    total:     body.total,
    status:    body.status,
    note:      body.note ?? '',
  }
  const { data, error } = await supabase
    .from('invoices')
    .insert(row)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
