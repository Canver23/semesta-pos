import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Database types (matches Supabase tables) ─────────────────
export type DbProduct = {
  id: number
  name: string
  category: string
  size: string
  unit: string
  price: number
  cost: number
  stock: number
  bestseller: boolean
  created_at?: string
}

export type DbCustomer = {
  id: string
  name: string
  phone: string
  email: string
  address: string
  prices: {
    prodId: number | null
    name: string
    size: string
    unit: string
    price: number
  }[]
  created_at?: string
}

export type DbInvoice = {
  id: string
  cust_id: string
  cust_name: string
  date: string
  due: string
  items: {
    name: string
    size: string
    qty: number
    unit: string
    price: number
    total: number
  }[]
  total: number
  status: 'Lunas' | 'Belum Lunas'
  note: string
  created_at?: string
}

export type DbTransaction = {
  id: string
  date: string
  time: string
  items: string
  total: number
  cash: number
  change: number
  method: string
  created_at?: string
}

export type DbAttendance = {
  id: number
  type: 'Check In' | 'Check Out'
  date: string
  time: string
  timestamp: number
  created_at?: string
}
