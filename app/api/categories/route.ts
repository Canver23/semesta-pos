import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { validateCategory } from '@/lib/validate'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('custom_categories')
    .select('name')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const cek = validateCategory(await req.json())
  if (!cek.ok) return NextResponse.json({ error: cek.error }, { status: 400 })
  const { data, error } = await supabase
    .from('custom_categories')
    .insert({ name: cek.value })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
