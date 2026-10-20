import { format } from 'date-fns'
import { id } from 'date-fns/locale'

/** Format quantity - show decimal only if needed */
export const fmtQty = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toString()

export const fmt = (n: number) =>
  'Rp ' + Math.round(n).toLocaleString('id-ID')

/** Pecah teks items transaksi ("Tulip 24 ×2, Kantong HD ×0.5") jadi baris struk. */
export function parseItemsText(items: string): { name: string; qty: number }[] {
  return (items || '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(.*?)\s*×\s*([\d.,]+)$/)
    if (!m) return { name: s, qty: 1 }
    const qty = parseFloat(m[2].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))
    return { name: m[1].trim(), qty: Number.isFinite(qty) && qty > 0 ? qty : 1 }
  })
}

export const fmtDate = (d: string) => {
  if (!d) return '-'
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const todayDisplay = () =>
  format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })

export const nowTime = () =>
  new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

/** Generate invoice ID: SMT-YYYYMMDD-NNNN */
export const generateInvoiceId = (existingCount: number, date: string) => {
  const ds  = date.replace(/-/g, '')
  const num = String(existingCount + 1).padStart(4, '0')
  return `SMT-${ds}-${num}`
}

/** Generate transaction ID: SMT-YYYYMMDD-XXXX (format sama dengan invoice) */
export const generateTrxId = (sameDayCount: number, date?: Date) => {
  const d  = date ?? new Date()
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const num = String(sameDayCount + 1).padStart(4, '0')
  return `SMT-${ds}-${num}`
}

export const CATEGORY_ICONS: Record<string, string> = {
  Sterofoam: '📦',
  Wrapping:  '🎁',
  Kantong:   '🛍️',
}

export const UNITS = ['Pcs', 'Bal', 'Pack', 'Lembar', 'Kg', 'Roll', 'Toros']
export const CATEGORIES = ['Sterofoam', 'Wrapping', 'Kantong', 'Lainnya'] 

export const STORE_INFO = {
  name:    'Semesta Plastik',
  bank:    'BCA',
  bankAcc: '3461191698',
  bankAN:  'Lie Tin Liung',
}
