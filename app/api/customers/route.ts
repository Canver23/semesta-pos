import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { validateCustomer } from '@/lib/validate'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = createServerClient()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body bukan JSON yang valid' }, { status: 400 })
  }

  const v = validateCustomer(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

  const { data, error } = await supabase
    .from('customers')
    .insert(v.value)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
