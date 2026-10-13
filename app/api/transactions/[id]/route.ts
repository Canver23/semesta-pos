import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient()
  const { id } = await params
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
