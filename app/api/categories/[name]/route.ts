import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function DELETE(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const supabase = createServerClient()
  const { name: rawName } = await params
  const name = decodeURIComponent(rawName)
  const { error } = await supabase
    .from('custom_categories')
    .delete()
    .eq('name', name)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
