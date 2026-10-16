'use client'
import { create } from 'zustand'
import type {
  Product, Customer, Invoice, Transaction,
  CartItem, AttendanceLog, ProductVariant,
} from './types'
import { generateInvoiceId, generateTrxId } from './utils'

// ─── Simple fetch helpers ─────────────────────────────────────
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `API error ${res.status}`)
  }
  return res.json()
}

// ─── Store State ──────────────────────────────────────────────
interface StoreState {
  loading: boolean
  initialized: boolean
  loadAll: () => Promise<void>
  resetData: () => void

  products: Product[]
  addProduct: (p: Omit<Product, 'id'>) => Promise<void>
  updateProduct: (id: number, p: Partial<Product>) => Promise<void>
  deleteProduct: (id: number) => Promise<void>

  customCategories: string[]
  addCategory: (name: string) => Promise<void>
  deleteCategory: (name: string) => Promise<void>
  allCategories: () => string[]

  customers: Customer[]
  addCustomer: (c: Omit<Customer, 'id'>) => Promise<void>
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>

  invoices: Invoice[]
  addInvoice: (inv: Omit<Invoice, 'id'>) => Promise<Invoice>
  updateInvoice: (id: string, data: Partial<Omit<Invoice, 'id' | 'status'>>) => Promise<void>
  updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>
  deleteInvoice: (id: string) => Promise<void>

  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<Transaction>
  deleteTransaction: (id: string) => Promise<void>
  resetTransactions: () => Promise<void>
  /** Checkout atomik: stok + transaksi ditulis server dalam satu transaksi DB. */
  checkout: (items: CartItem[], cash: number) => Promise<Transaction>

  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'qty'>) => void
  changeQty: (id: number, variant: string | undefined, delta: number) => void
  setQty: (id: number, variant: string | undefined, qty: number) => void
  removeFromCart: (id: number, variant?: string) => void
  clearCart: () => void

  attendanceLogs: AttendanceLog[]
  addAttendance: (type: AttendanceLog['type']) => Promise<void>
}

const DEFAULT_CATEGORIES = ['Sterofoam', 'Wrapping', 'Kantong', 'Lainnya']

export const useStore = create<StoreState>()((set, get) => ({
  loading: false,
  initialized: false,

  loadAll: async () => {
    if (get().initialized) return
    set({ loading: true })
    try {
      // Promise.allSettled: bila SATU endpoint gagal (mis. 403 untuk role
      // kasir), endpoint lain tetap dimuat. Sebelumnya Promise.all membuat
      // SELURUH data hilang dari layar begitu satu request ditolak.
      const [products, customers, invoices, transactions, attendance, categories] =
        await Promise.allSettled([
          api<Product[]>('/api/products'),
          api<Customer[]>('/api/customers'),
          api<Invoice[]>('/api/invoices'),
          api<Transaction[]>('/api/transactions'),
          api<AttendanceLog[]>('/api/attendance'),
          api<{ name: string }[]>('/api/categories'),
        ])

      const ok = <T>(r: PromiseSettledResult<T>, fallback: T): T => {
        if (r.status === 'fulfilled') return r.value ?? fallback
        console.error('Gagal memuat sebagian data:', r.reason)
        return fallback
      }

      set({
        products:         ok(products, []),
        customers:        ok(customers, []),
        invoices:         ok(invoices, []),
        transactions:     ok(transactions, []),
        attendanceLogs:   ok(attendance, []),
        customCategories: ok(categories, []).map((c: { name: string }) => c.name),
        initialized: true,
      })
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      set({ loading: false })
    }
  },

  // Bersihkan data saat keluar / pindah ke halaman login, supaya
  // pengguna berikutnya tidak melihat sisa data dan loadAll bisa jalan lagi.
  resetData: () => set({
    initialized: false,
    loading: false,
    products: [],
    customers: [],
    invoices: [],
    transactions: [],
    attendanceLogs: [],
    customCategories: [],
    cart: [],
  }),

  // ── Products ───────────────────────────────────────────────
  products: [],
  addProduct: async (p) => {
    const data = await api<Product>('/api/products', { method: 'POST', body: JSON.stringify(p) })
    set(s => ({ products: [...s.products, data] }))
  },
  updateProduct: async (id, p) => {
    const data = await api<Product>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(p) })
    set(s => ({ products: s.products.map(x => x.id === id ? { ...x, ...data } : x) }))
  },
  deleteProduct: async (id) => {
    await api(`/api/products/${id}`, { method: 'DELETE' })
    set(s => ({ products: s.products.filter(x => x.id !== id) }))
  },

  // ── Categories ────────────────────────────────────────────
  customCategories: [],
  addCategory: async (name) => {
    if (!name.trim()) return
    const all = get().allCategories()
    if (all.includes(name.trim())) return
    await api('/api/categories', { method: 'POST', body: JSON.stringify({ name: name.trim() }) })
    set(s => ({ customCategories: [...s.customCategories, name.trim()] }))
  },
  deleteCategory: async (name) => {
    await api(`/api/categories/${encodeURIComponent(name)}`, { method: 'DELETE' })
    set(s => ({ customCategories: s.customCategories.filter(c => c !== name) }))
  },
  allCategories: () => {
    const s = get()
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...s.customCategories]))
  },

  // ── Customers ─────────────────────────────────────────────
  customers: [],
  addCustomer: async (c) => {
    const newId = 'C' + String(get().customers.length + 1).padStart(3, '0')
    const data  = await api<Customer>('/api/customers', { method: 'POST', body: JSON.stringify({ ...c, id: newId }) })
    set(s => ({ customers: [...s.customers, data] }))
  },
  updateCustomer: async (id, c) => {
    const data = await api<Customer>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(c) })
    set(s => ({ customers: s.customers.map(x => x.id === id ? { ...x, ...data } : x) }))
  },
  deleteCustomer: async (id) => {
    await api(`/api/customers/${id}`, { method: 'DELETE' })
    set(s => ({ customers: s.customers.filter(x => x.id !== id) }))
  },

  // ── Invoices ──────────────────────────────────────────────
  invoices: [],

  addInvoice: async (inv) => {
    const sameDay = get().invoices.filter(i => i.date === inv.date).length
    const id      = generateInvoiceId(sameDay, inv.date)
    const newInv  = { ...inv, id }
    await api('/api/invoices', { method: 'POST', body: JSON.stringify(newInv) })
    set(s => ({ invoices: [newInv as Invoice, ...s.invoices] }))
    return newInv as Invoice
  },

  // ── UPDATE INVOICE (edit items, pelanggan, tanggal, dll) ──
  updateInvoice: async (id, data) => {
    // Build update payload — map camelCase to snake_case for API
    const payload: Record<string, unknown> = {}
    if (data.custId   !== undefined) payload.cust_id   = data.custId
    if (data.custName !== undefined) payload.cust_name = data.custName
    if (data.date     !== undefined) payload.date      = data.date
    if (data.due      !== undefined) payload.due       = data.due
    if (data.items    !== undefined) payload.items     = data.items
    if (data.total    !== undefined) payload.total     = data.total
    if (data.note     !== undefined) payload.note      = data.note

    await api(`/api/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })

    // Update local state
    set(s => ({
      invoices: s.invoices.map(x =>
        x.id === id ? { ...x, ...data } : x
      ),
    }))
  },

  updateInvoiceStatus: async (id, status) => {
    await api(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
    set(s => ({ invoices: s.invoices.map(x => x.id === id ? { ...x, status } : x) }))
  },

  deleteInvoice: async (id) => {
    await api(`/api/invoices/${id}`, { method: 'DELETE' })
    set(s => ({ invoices: s.invoices.filter(x => x.id !== id) }))
  },

  // ── Transactions ──────────────────────────────────────────
  transactions: [],
  addTransaction: async (t) => {
    const now          = new Date()
    const todayStr     = now.toLocaleDateString('id-ID')
    const sameDayCount = get().transactions.filter(x => x.date === todayStr).length
    const id           = generateTrxId(sameDayCount, now)
    const newT         = { ...t, id }
    await api('/api/transactions', { method: 'POST', body: JSON.stringify(newT) })
    set(s => ({ transactions: [newT as Transaction, ...s.transactions] }))
    return newT as Transaction
  },
  deleteTransaction: async (id) => {
    await api(`/api/transactions/${id}`, { method: 'DELETE' })
    set(s => ({ transactions: s.transactions.filter(x => x.id !== id) }))
  },
  resetTransactions: async () => {
    await api('/api/transactions', { method: 'DELETE' })
    set({ transactions: [] })
  },
  // Checkout atomik — satu panggilan ke server; stok dan transaksi ditulis
  // bersamaan di database, jadi keduanya selalu konsisten.
  checkout: async (items, cash) => {
    const res = await api<{ transaction: Transaction; products: { id: number; stock: number; variants?: ProductVariant[] }[] }>(
      '/api/checkout',
      {
        method: 'POST',
        body: JSON.stringify({
          items: items.map(i => ({
            id: i.id, name: i.name, qty: i.qty, unit: i.unit, price: i.price, variant: i.variant,
          })),
          cash,
          method: 'Cash',
        }),
      },
    )
    // Sinkronkan stok lokal dengan stok yang benar-benar tersimpan di database
    set(s => ({
      transactions: [res.transaction, ...s.transactions],
      products: s.products.map(p => {
        const upd = res.products.find(u => u.id === p.id)
        if (!upd) return p
        return {
          ...p,
          stock: upd.stock,
          variants: upd.variants && upd.variants.length ? upd.variants : p.variants,
        }
      }),
    }))
    return res.transaction
  },

  // ── Cart (local only) ─────────────────────────────────────
  cart: [],
  addToCart: (item) => set(s => {
    const existing = s.cart.find(x => x.id === item.id && (x.variant ?? '') === (item.variant ?? ''))
    if (existing) return { cart: s.cart.map(x => x.id === item.id && (x.variant ?? '') === (item.variant ?? '') ? { ...x, qty: x.qty + 1 } : x) }
    return { cart: [...s.cart, { ...item, qty: 1 }] }
  }),
  changeQty: (id, variant, delta) => set(s => ({
    cart: s.cart.map(x => x.id === id && (x.variant ?? '') === (variant ?? '')
      ? { ...x, qty: Math.max(0.001, Math.round((x.qty + delta) * 1000) / 1000) }
      : x
    ).filter(x => x.qty > 0)
  })),
  setQty: (id, variant, qty) => set(s => ({
    cart: qty <= 0
      ? s.cart.filter(x => !(x.id === id && (x.variant ?? '') === (variant ?? '')))
      : s.cart.map(x => x.id === id && (x.variant ?? '') === (variant ?? '') ? { ...x, qty: Math.round(qty * 1000) / 1000 } : x)
  })),
  removeFromCart: (id, variant) => set(s => ({ cart: s.cart.filter(x => !(x.id === id && (x.variant ?? '') === (variant ?? ''))) })),
  clearCart: () => set({ cart: [] }),

  // ── Attendance ────────────────────────────────────────────
  attendanceLogs: [],
  addAttendance: async (type) => {
    const now = new Date()
    const log = {
      type,
      date:      now.toLocaleDateString('id-ID'),
      time:      now.toLocaleTimeString('id-ID'),
      timestamp: now.getTime(),
    }
    const data = await api<AttendanceLog>('/api/attendance', { method: 'POST', body: JSON.stringify(log) })
    set(s => ({ attendanceLogs: [data, ...s.attendanceLogs] }))
  },
}))
