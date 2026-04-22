'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Product, Customer, Invoice, Transaction,
  CartItem, AttendanceLog,
} from './types'
import {
  SEED_PRODUCTS, SEED_CUSTOMERS, SEED_INVOICES, SEED_TRANSACTIONS,
} from './data'
import { generateInvoiceId, generateTrxId } from './utils'

interface StoreState {
  // Products
  products: Product[]
  addProduct: (p: Omit<Product, 'id'>) => void
  updateProduct: (id: number, p: Partial<Product>) => void
  deleteProduct: (id: number) => void

  // Categories (custom)
  customCategories: string[]
  addCategory: (name: string) => void
  deleteCategory: (name: string) => void
  allCategories: () => string[]

  // Customers
  customers: Customer[]
  addCustomer: (c: Omit<Customer, 'id'>) => void
  updateCustomer: (id: string, c: Partial<Customer>) => void
  deleteCustomer: (id: string) => void

  // Invoices
  invoices: Invoice[]
  addInvoice: (inv: Omit<Invoice, 'id'>) => Invoice
  updateInvoiceStatus: (id: string, status: Invoice['status']) => void
  deleteInvoice: (id: string) => void

  // Transactions (kasir)
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, 'id'>) => Transaction
  deleteTransaction: (id: string) => void
  resetTransactions: () => void

  // Cart
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'qty'>) => void
  changeQty: (id: number, delta: number) => void
  removeFromCart: (id: number) => void
  clearCart: () => void

  // Attendance
  attendanceLogs: AttendanceLog[]
  addAttendance: (type: AttendanceLog['type']) => void
}

const DEFAULT_CATEGORIES = ['Sterofoam', 'Wrapping', 'Kantong', 'Lainnya']

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // ── Products ──────────────────────────────────────────
      products: SEED_PRODUCTS,
      addProduct: (p) => set(s => ({ products: [...s.products, { ...p, id: Date.now() }] })),
      updateProduct: (id, p) => set(s => ({ products: s.products.map(x => x.id === id ? { ...x, ...p } : x) })),
      deleteProduct: (id) => set(s => ({ products: s.products.filter(x => x.id !== id) })),

      // ── Categories ────────────────────────────────────────
      customCategories: [],
      addCategory: (name) => set(s => {
        if (!name.trim()) return s
        const all = get().allCategories()
        if (all.includes(name.trim())) return s
        return { customCategories: [...s.customCategories, name.trim()] }
      }),
      deleteCategory: (name) => set(s => ({
        customCategories: s.customCategories.filter(c => c !== name)
      })),
      allCategories: () => {
        const s = get()
        return [...new Set([...DEFAULT_CATEGORIES, ...s.customCategories])]
      },

      // ── Customers ─────────────────────────────────────────
      customers: SEED_CUSTOMERS,
      addCustomer: (c) => set(s => {
        const newId = 'C' + String(s.customers.length + 1).padStart(3, '0')
        return { customers: [...s.customers, { ...c, id: newId }] }
      }),
      updateCustomer: (id, c) => set(s => ({ customers: s.customers.map(x => x.id === id ? { ...x, ...c } : x) })),
      deleteCustomer: (id) => set(s => ({ customers: s.customers.filter(x => x.id !== id) })),

      // ── Invoices ──────────────────────────────────────────
      invoices: SEED_INVOICES,
      addInvoice: (inv) => {
        const sameDay = get().invoices.filter(i => i.date === inv.date).length
        const newInv: Invoice = { ...inv, id: generateInvoiceId(sameDay, inv.date) }
        set(s => ({ invoices: [newInv, ...s.invoices] }))
        return newInv
      },
      updateInvoiceStatus: (id, status) => set(s => ({ invoices: s.invoices.map(x => x.id === id ? { ...x, status } : x) })),
      deleteInvoice: (id) => set(s => ({ invoices: s.invoices.filter(x => x.id !== id) })),

      // ── Transactions ──────────────────────────────────────
      transactions: SEED_TRANSACTIONS,
      addTransaction: (t) => {
        const now = new Date()
        const todayStr = now.toLocaleDateString('id-ID')
        const sameDayCount = get().transactions.filter(x => x.date === todayStr).length
        const newT: Transaction = { ...t, id: generateTrxId(sameDayCount, now) }
        set(s => ({ transactions: [newT, ...s.transactions] }))
        return newT
      },
      deleteTransaction: (id) => set(s => ({ transactions: s.transactions.filter(x => x.id !== id) })),
      resetTransactions: () => set({ transactions: [] }),

      // ── Cart ──────────────────────────────────────────────
      cart: [],
      addToCart: (item) => set(s => {
        const existing = s.cart.find(x => x.id === item.id)
        if (existing) return { cart: s.cart.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x) }
        return { cart: [...s.cart, { ...item, qty: 1 }] }
      }),
      changeQty: (id, delta) => set(s => ({
        cart: s.cart.map(x => x.id === id ? { ...x, qty: x.qty + delta } : x).filter(x => x.qty > 0)
      })),
      removeFromCart: (id) => set(s => ({ cart: s.cart.filter(x => x.id !== id) })),
      clearCart: () => set({ cart: [] }),

      // ── Attendance ────────────────────────────────────────
      attendanceLogs: [],
      addAttendance: (type) => set(s => {
        const now = new Date()
        return { attendanceLogs: [{ id: Date.now(), type, date: now.toLocaleDateString('id-ID'), time: now.toLocaleTimeString('id-ID'), timestamp: now.getTime() }, ...s.attendanceLogs] }
      }),
    }),
    {
      name: 'semesta-pos-storage',
      partialize: s => ({
        products:         s.products,
        customCategories: s.customCategories,
        customers:        s.customers,
        invoices:         s.invoices,
        transactions:     s.transactions,
        attendanceLogs:   s.attendanceLogs,
      }),
    }
  )
)
