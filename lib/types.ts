// ─── Products ────────────────────────────────────────────────
export interface Product {
  id: number
  name: string
  category: string
  size: string
  unit: string
  price: number
  stock: number
  bestseller: boolean
}

// ─── Customers ───────────────────────────────────────────────
export interface CustomerPrice {
  prodId: number | null   // null = produk khusus pelanggan (tidak ada di katalog umum)
  name: string
  size: string
  unit: string
  price: number
}

export interface Customer {
  id: string              // e.g. "C001"
  name: string
  phone: string
  email: string
  address: string
  prices: CustomerPrice[] // harga & produk khusus pelanggan ini
}

// ─── Cart ────────────────────────────────────────────────────
export interface CartItem {
  id: number
  name: string
  price: number
  qty: number
  unit: string
}

// ─── Invoice ─────────────────────────────────────────────────
export interface InvoiceItem {
  name: string
  size: string
  qty: number
  unit: string
  price: number
  total: number
}

export type InvoiceStatus = 'Belum Lunas' | 'Lunas'

export interface Invoice {
  id: string              // e.g. "SMT-20250709-0001"
  custId: string
  custName: string
  date: string            // "YYYY-MM-DD"
  due: string             // "YYYY-MM-DD"
  items: InvoiceItem[]
  total: number
  status: InvoiceStatus
  note: string
}

// ─── Transactions (kasir) ────────────────────────────────────
export interface Transaction {
  id: string              // e.g. "TRX-001"
  date: string
  time: string
  items: string
  total: number
  cash: number
  change: number
  method: 'Cash'
}

// ─── Attendance ──────────────────────────────────────────────
export type AttendanceType = 'Check In' | 'Check Out'

export interface AttendanceLog {
  id: number
  type: AttendanceType
  date: string
  time: string
  timestamp: number
}
