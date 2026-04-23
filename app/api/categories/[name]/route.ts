import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(_: Request, { params }: { params: { name: string } }) {
  const name = decodeURIComponent(params.name)
  const { error } = await supabase
    .from('custom_categories')
    .delete()
    .eq('name', name)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
