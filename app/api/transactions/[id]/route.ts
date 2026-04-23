import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
