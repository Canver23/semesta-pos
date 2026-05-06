import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PUT — update status only (Lunas / Belum Lunas)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: body.status })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — update invoice content (items, pelanggan, tanggal, dll)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()

  // Only update fields that were sent
  const update: Record<string, unknown> = {}
  if (body.cust_id   !== undefined) update.cust_id   = body.cust_id
  if (body.cust_name !== undefined) update.cust_name = body.cust_name
  if (body.date      !== undefined) update.date      = body.date
  if (body.due       !== undefined) update.due       = body.due
  if (body.items     !== undefined) update.items     = body.items
  if (body.total     !== undefined) update.total     = body.total
  if (body.note      !== undefined) update.note      = body.note

  const { data, error } = await supabase
    .from('invoices')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return in camelCase for frontend
  return NextResponse.json({
    id:       data.id,
    custId:   data.cust_id,
    custName: data.cust_name,
    date:     data.date,
    due:      data.due,
    items:    data.items,
    total:    data.total,
    status:   data.status,
    note:     data.note,
  })
}

// DELETE — hapus invoice
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
