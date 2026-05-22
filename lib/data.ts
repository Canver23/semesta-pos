import type { Product, Customer, Invoice, Transaction } from './types'

export const SEED_PRODUCTS: any[] = [
  { id: 1,  name: 'Sterofoam T1',     category: 'Sterofoam', size: 'T1',   unit: 'Pcs',  price: 3500,  stock: 120, bestseller: true  },
  { id: 2,  name: 'Sterofoam T2',     category: 'Sterofoam', size: 'T2',   unit: 'Pcs',  price: 5000,  stock: 85,  bestseller: false },
  { id: 3,  name: 'Sterofoam T3',     category: 'Sterofoam', size: 'T3',   unit: 'Pcs',  price: 7500,  stock: 60,  bestseller: false },
  { id: 4,  name: 'Sterofoam T4',     category: 'Sterofoam', size: 'T4',   unit: 'Pcs',  price: 12000, stock: 40,  bestseller: false },
  { id: 5,  name: 'Bestfresh 20',     category: 'Wrapping',  size: '20cm', unit: 'Roll', price: 8500,  stock: 200, bestseller: true  },
  { id: 6,  name: 'Bestfresh 25',     category: 'Wrapping',  size: '25cm', unit: 'Roll', price: 11000, stock: 150, bestseller: false },
  { id: 7,  name: 'Bestfresh 30',     category: 'Wrapping',  size: '30cm', unit: 'Roll', price: 15000, stock: 90,  bestseller: false },
  { id: 8,  name: 'Kantong Kresek S', category: 'Kantong',   size: 'S',    unit: 'Bal',  price: 25000, stock: 300, bestseller: false },
  { id: 9,  name: 'Kantong Kresek M', category: 'Kantong',   size: 'M',    unit: 'Bal',  price: 35000, stock: 250, bestseller: false },
  { id: 10, name: 'Kantong Kresek L', category: 'Kantong',   size: 'L',    unit: 'Bal',  price: 55000, stock: 180, bestseller: true  },
]

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'C001',
    name: 'Toko Bu Sari',
    phone: '081234567890',
    email: '',
    address: 'Jl. Pasar Baru No.5, Bandung',
    prices: [
      { prodId: 1,    name: 'Sterofoam T1',    size: 'T1',   unit: 'Pcs', price: 3000  },
      { prodId: 9,    name: 'Kantong Kresek M', size: 'M',    unit: 'Bal', price: 30000 },
      { prodId: null, name: 'Plastik HD 50',    size: '50cm', unit: 'Bal', price: 80000 },
    ],
  },
  {
    id: 'C002',
    name: 'Pak Hendra Grosir',
    phone: '085678901234',
    email: 'hendra@gmail.com',
    address: 'Jl. Raya Cimahi No.12',
    prices: [
      { prodId: 2, name: 'Sterofoam T2', size: 'T2',   unit: 'Pcs',  price: 4200 },
      { prodId: 5, name: 'Bestfresh 20', size: '20cm', unit: 'Roll', price: 7500 },
      { prodId: 6, name: 'Bestfresh 25', size: '25cm', unit: 'Roll', price: 9500 },
    ],
  },
]

export const SEED_INVOICES: Invoice[] = [
  {
    id: 'SMT-20250709-0001',
    custId: 'C001',
    custName: 'Toko Bu Sari',
    date: '2025-07-09',
    due: '2025-07-23',
    items: [
      { name: 'Sterofoam T1',    size: 'T1', qty: 10, unit: 'Pcs', price: 3000,  total: 30000 },
      { name: 'Kantong Kresek M',size: 'M',  qty: 2,  unit: 'Bal', price: 30000, total: 60000 },
    ],
    total: 90000,
    status: 'Lunas',
    note: '',
  },
  {
    id: 'SMT-20250709-0002',
    custId: 'C002',
    custName: 'Pak Hendra Grosir',
    date: '2025-07-09',
    due: '2025-07-23',
    items: [
      { name: 'Bestfresh 20', size: '20cm', qty: 4, unit: 'Roll', price: 7500, total: 30000 },
      { name: 'Bestfresh 25', size: '25cm', qty: 3, unit: 'Roll', price: 9500, total: 28500 },
    ],
    total: 58500,
    status: 'Belum Lunas',
    note: 'Dikirim ke gudang',
  },
]

// Seed transactions pakai format SMT baru
export const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'SMT-20250417-0001',
    date: '17/04/2025', time: '09:12',
    items: 'Sterofoam T1 ×2, Bestfresh 20 ×1',
    total: 15500, cash: 20000, change: 4500, method: 'Cash',
  },
  {
    id: 'SMT-20250417-0002',
    date: '17/04/2025', time: '10:33',
    items: 'Kantong Kresek L ×5',
    total: 275000, cash: 300000, change: 25000, method: 'Cash',
  },
  {
    id: 'SMT-20250417-0003',
    date: '17/04/2025', time: '11:05',
    items: 'Sterofoam T2 ×3',
    total: 15000, cash: 15000, change: 0, method: 'Cash',
  },
]
