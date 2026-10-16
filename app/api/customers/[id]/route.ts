import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { validateCustomer } from '@/lib/validate'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id } = await params

  const cek = validateCustomer(await req.json(), true)
  if (!cek.ok) return NextResponse.json({ error: cek.error }, { status: 400 })

  const { data, error } = await supabase
    .from('customers')
    .update(cek.value)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id } = await params
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
