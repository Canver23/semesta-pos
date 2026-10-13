import { createClient } from '@supabase/supabase-js'

// Server-only Supabase client.
// Prioritas: SERVICE_ROLE key (bypass RLS, hanya boleh dipakai di server).
// Fallback: anon key untuk kompatibilitas (RLS allow_all → tidak aman).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl) {
  console.error('[supabase] NEXT_PUBLIC_SUPABASE_URL belum diset')
}
if (!serviceKey && process.env.NODE_ENV === 'production') {
  console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY belum diset — memakai anon key. ' +
    'Set service role key + aktifkan RLS agar database tidak bisa diakses langsung dari browser.')
}

/** 
 * Server-only Supabase client (service role bila tersedia).
 * Lazy instantiation — tidak crash saat build bila env belum diset.
 */
export function createServerClient() {
  return createClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false },
  })
}

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
