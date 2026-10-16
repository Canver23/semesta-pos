import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { validateInvoice } from '@/lib/validate'

// PUT — update status only (Lunas / Belum Lunas)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id } = await params
  const body = await req.json()
  const status = body?.status
  if (status !== 'Lunas' && status !== 'Belum Lunas') {
    return NextResponse.json({ error: 'Status harus "Lunas" atau "Belum Lunas"' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — update invoice content (items, pelanggan, tanggal, dll)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id } = await params

  // Validasi hanya field yang dikirim; total dihitung ulang dari items.
  const cek = validateInvoice(await req.json(), true)
  if (!cek.ok) return NextResponse.json({ error: cek.error }, { status: 400 })

  const { data, error } = await supabase
    .from('invoices')
    .update(cek.value)
    .eq('id', id)
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
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id } = await params
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
