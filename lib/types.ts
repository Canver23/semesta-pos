// ─── Product Variant (warna/varian) ──────────────────────────
export interface ProductVariant {
  id: string        // e.g. "hitam", "putih", "merah"
  name: string      // "Hitam", "Putih", "Merah"
  stock: number
}

// ─── Products ────────────────────────────────────────────────
export interface Product {
  id: number
  name: string
  category: string
  size: string
  unit: string
  price: number       // harga eceran (default / harga umum)
  cost: number        // harga modal (harga beli per satuan)
  stock: number
  bestseller: boolean

  // Harga grosir (opsional — kosong = tidak punya harga grosir)
  priceWholesale: number    // harga per satuan grosir, 0 = tidak ada
  unitWholesale: string     // satuan grosir, e.g. "Pack", "Bal", "Karton"
  qtyWholesale: number      // isi per satuan grosir, e.g. 10 (1 Pack = 10 Pcs)

  // Varian warna/tipe (opsional — kosong = tidak punya varian)
  variants: ProductVariant[]
}

// ─── Customers ───────────────────────────────────────────────
export interface CustomerPrice {
  prodId: number | null
  name: string
  size: string
  unit: string
  price: number
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  address: string
  prices: CustomerPrice[]
}

// ─── Cart ────────────────────────────────────────────────────
export interface CartItem {
  id: number
  name: string          // bisa include varian: "Kresek Mobil 15 - Hitam"
  price: number
  qty: number
  unit: string
  variant?: string      // nama varian yang dipilih, opsional
  priceType?: 'retail' | 'wholesale'  // jenis harga yang dipilih
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
  id: string
  custId: string
  custName: string
  date: string
  due: string
  items: InvoiceItem[]
  total: number
  status: InvoiceStatus
  note: string
}

// ─── Transactions (kasir) ────────────────────────────────────
export interface Transaction {
  id: string
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
