import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      id:     body.id,
      date:   body.date,
      time:   body.time,
      items:  body.items,
      total:  body.total,
      cash:   body.cash,
      change: body.change,
      method: body.method,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE() {
  // Reset all transactions
  const { error } = await supabase
    .from('transactions')
    .delete()
    .neq('id', '')   // delete all
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
