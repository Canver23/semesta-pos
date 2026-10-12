import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('timestamp', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const body = await req.json()
  const { data, error } = await supabase
    .from('attendance')
    .insert({
      type:      body.type,
      date:      body.date,
      time:      body.time,
      timestamp: body.timestamp,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
