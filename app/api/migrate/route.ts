import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const supabase = createServerClient()
  const { products, customers, invoices, transactions, attendanceLogs, customCategories } = await req.json()
  const results: Record<string, unknown> = {}
  const errors: string[] = []

  // Products
  if (products?.length) {
    const { error } = await supabase.from('products').upsert(products, { onConflict: 'id' })
    if (error) errors.push(`products: ${error.message}`)
    else results.products = products.length
  }

  // Custom categories
  if (customCategories?.length) {
    const rows = customCategories.map((name: string) => ({ name }))
    const { error } = await supabase.from('custom_categories').upsert(rows, { onConflict: 'name' })
    if (error) errors.push(`categories: ${error.message}`)
    else results.categories = customCategories.length
  }

  // Customers
  if (customers?.length) {
    const { error } = await supabase.from('customers').upsert(customers, { onConflict: 'id' })
    if (error) errors.push(`customers: ${error.message}`)
    else results.customers = customers.length
  }

  // Invoices
  if (invoices?.length) {
    const rows = invoices.map((i: Record<string, unknown>) => ({
      id:        i.id,
      cust_id:   i.custId,
      cust_name: i.custName,
      date:      i.date,
      due:       i.due,
      items:     i.items,
      total:     i.total,
      status:    i.status,
      note:      i.note ?? '',
    }))
    const { error } = await supabase.from('invoices').upsert(rows, { onConflict: 'id' })
    if (error) errors.push(`invoices: ${error.message}`)
    else results.invoices = invoices.length
  }

  // Transactions
  if (transactions?.length) {
    const rows = transactions.map((t: Record<string, unknown>) => ({
      id:     t.id,
      date:   t.date,
      time:   t.time,
      items:  t.items,
      total:  t.total,
      cash:   t.cash,
      change: t.change,
      method: t.method,
    }))
    const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' })
    if (error) errors.push(`transactions: ${error.message}`)
    else results.transactions = transactions.length
  }

  // Attendance
  if (attendanceLogs?.length) {
    const rows = attendanceLogs.map((a: Record<string, unknown>) => ({
      type:      a.type,
      date:      a.date,
      time:      a.time,
      timestamp: a.timestamp,
    }))
    const { error } = await supabase.from('attendance').insert(rows)
    if (error) errors.push(`attendance: ${error.message}`)
    else results.attendance = attendanceLogs.length
  }

  if (errors.length) {
    return NextResponse.json({ success: false, errors, results }, { status: 207 })
  }
  return NextResponse.json({ success: true, results })
}
