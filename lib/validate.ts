// ─── Validasi input API (Prioritas 2: Integritas Data) ──────────
// Dipakai semua API route tulis (POST/PUT/PATCH) supaya body dari klien
// tidak langsung dipercaya masuk database.
//
// Aturan: fungsi validate* mengembalikan { ok: true, value } atau
// { ok: false, error } — pemanggil membalas 400 dengan pesan `error`.

export type Valid<T> = { ok: true; value: T } | { ok: false; error: string }

const MAX_STR   = 200      // panjang maksimum teks umum
const MAX_ITEMS = 500      // maksimum baris dalam satu transaksi/invoice
const MAX_NUM   = 1_000_000_000

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Angka valid: finite, bukan NaN, dalam rentang wajar. */
export function num(v: unknown, field: string, opts: { min?: number; max?: number; int?: boolean } = {}): Valid<number> {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return { ok: false, error: `${field} harus berupa angka` }
  }
  if (opts.int && !Number.isInteger(v)) return { ok: false, error: `${field} harus bilangan bulat` }
  if (opts.min !== undefined && v < opts.min) return { ok: false, error: `${field} minimal ${opts.min}` }
  if (opts.max !== undefined && v > opts.max) return { ok: false, error: `${field} maksimal ${opts.max}` }
  if (Math.abs(v) > MAX_NUM) return { ok: false, error: `${field} di luar rentang wajar` }
  return { ok: true, value: v }
}

/** Teks valid: string, panjang dibatasi, opsional wajib terisi. */
export function str(v: unknown, field: string, opts: { required?: boolean; max?: number } = {}): Valid<string> {
  const max = opts.max ?? MAX_STR
  if (v === undefined || v === null) {
    return opts.required ? { ok: false, error: `${field} wajib diisi` } : { ok: true, value: '' }
  }
  if (typeof v !== 'string') return { ok: false, error: `${field} harus berupa teks` }
  const t = v.trim()
  if (opts.required && !t) return { ok: false, error: `${field} wajib diisi` }
  if (t.length > max) return { ok: false, error: `${field} maksimal ${max} karakter` }
  // Tolak karakter kontrol (mis. \u0000) yang bisa merusak penyimpanan
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(t)) {
    return { ok: false, error: `${field} memuat karakter tidak valid` }
  }
  return { ok: true, value: t }
}

/** Array varian produk. */
type Variant = { id: string; name: string; stock: number }
export function variants(v: unknown): Valid<Variant[]> {
  if (v === undefined || v === null) return { ok: true, value: [] }
  if (!Array.isArray(v)) return { ok: false, error: 'variants harus berupa daftar' }
  if (v.length > 100) return { ok: false, error: 'variants maksimal 100 varian' }
  const out: Variant[] = []
  for (let i = 0; i < v.length; i++) {
    const x = v[i]
    if (!isObj(x)) return { ok: false, error: `variants[${i}] tidak valid` }
    const id    = str(x.id,   `variants[${i}].id`,   { required: true, max: 60 })
    const name  = str(x.name, `variants[${i}].name`, { max: 60 })
    const stock = num(x.stock, `variants[${i}].stock`, { min: 0 })
    if (!id.ok) return id
    if (!name.ok) return name
    if (!stock.ok) return stock
    out.push({ id: id.value, name: name.value || id.value, stock: stock.value })
  }
  return { ok: true, value: out }
}

// ─── Produk ────────────────────────────────────────────────────
export type ProductInput = Partial<{
  name: string; category: string; size: string; unit: string
  price: number; cost: number; stock: number; bestseller: boolean
  priceWholesale: number; unitWholesale: string; qtyWholesale: number
  variants: Variant[]
}>

/**
 * Validasi payload produk. `partial=true` (untuk PUT/PATCH) hanya
 * memeriksa field yang memang dikirim.
 */
export function validateProduct(body: unknown, partial = false): Valid<ProductInput> {
  if (!isObj(body)) return { ok: false, error: 'Body harus berupa objek' }
  const out: ProductInput = {}
  const has = (k: string) => body[k] !== undefined && body[k] !== null

  const textFields: [keyof ProductInput, string, boolean][] = [
    ['name',     'Nama produk', !partial],
    ['category', 'Kategori',    false],
    ['size',     'Ukuran',      false],
    ['unit',     'Satuan',      false],
  ]
  for (const [key, label, required] of textFields) {
    if (!has(key as string) && !required) continue
    const r = str(body[key as string], label, { required, max: 120 })
    if (!r.ok) return r
    ;(out as Record<string, unknown>)[key] = r.value
  }

  if (has('price')) {
    const r = num(body.price, 'Harga jual', { min: 0 }); if (!r.ok) return r
    out.price = r.value
  }
  if (has('cost')) {
    const r = num(body.cost, 'Harga modal', { min: 0 }); if (!r.ok) return r
    out.cost = r.value
  }
  if (has('stock')) {
    const r = num(body.stock, 'Stok', { min: 0 }); if (!r.ok) return r
    out.stock = r.value
  }
  if (has('priceWholesale')) {
    const r = num(body.priceWholesale, 'Harga grosir', { min: 0 }); if (!r.ok) return r
    out.priceWholesale = r.value
  }
  if (has('qtyWholesale')) {
    const r = num(body.qtyWholesale, 'Isi per grosir', { min: 0 }); if (!r.ok) return r
    out.qtyWholesale = r.value
  }
  if (has('unitWholesale')) {
    const r = str(body.unitWholesale, 'Satuan grosir', { max: 60 }); if (!r.ok) return r
    out.unitWholesale = r.value
  }
  if (has('bestseller')) {
    if (typeof body.bestseller !== 'boolean') return { ok: false, error: 'Bestseller harus true/false' }
    out.bestseller = body.bestseller
  }
  if (has('variants')) {
    const r = variants(body.variants); if (!r.ok) return r
    out.variants = r.value
  }
  return { ok: true, value: out }
}

// ─── Transaksi (checkout) ──────────────────────────────────────
export type CheckoutLine = { id: number; name: string; qty: number; unit: string; price: number; variant?: string }
export type CheckoutInput = { items: CheckoutLine[]; cash: number; method: string }

export function validateCheckout(body: unknown): Valid<CheckoutInput> {
  if (!isObj(body)) return { ok: false, error: 'Body harus berupa objek' }
  const raw = body.items
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'Keranjang kosong — tidak ada item untuk dibayar' }
  }
  if (raw.length > MAX_ITEMS) return { ok: false, error: `Maksimal ${MAX_ITEMS} baris per transaksi` }

  const items: CheckoutLine[] = []
  for (let i = 0; i < raw.length; i++) {
    const x = raw[i]
    if (!isObj(x)) return { ok: false, error: `items[${i}] tidak valid` }
    const id    = num(x.id,    `items[${i}].id`,    { min: 1, int: true })
    const name  = str(x.name,  `items[${i}].nama`,  { required: true, max: 200 })
    const qty   = num(x.qty,   `items[${i}].qty`,   { min: 0.001 })
    const unit  = str(x.unit,  `items[${i}].satuan`, { max: 30 })
    const price = num(x.price, `items[${i}].harga`, { min: 0 })
    if (!id.ok) return id
    if (!name.ok) return name
    if (!qty.ok) return qty
    if (!unit.ok) return unit
    if (!price.ok) return price
    const vname = x.variant === undefined || x.variant === null ? '' : String(x.variant)
    if (vname.length > 60) return { ok: false, error: `items[${i}].varian terlalu panjang` }
    items.push({ id: id.value, name: name.value, qty: qty.value, unit: unit.value, price: price.value, variant: vname || undefined })
  }

  const cash = num(body.cash, 'Uang bayar', { min: 0 })
  if (!cash.ok) return cash

  const method = str(body.method ?? 'Cash', 'Metode', { max: 30 })
  if (!method.ok) return method

  const total = items.reduce((s, i) => s + Math.round(i.price * i.qty), 0)
  if (cash.value + 0.5 < total) {
    return { ok: false, error: `Uang bayar (${cash.value}) kurang dari total (${total})` }
  }

  return { ok: true, value: { items, cash: cash.value, method: method.value || 'Cash' } }
}

// ─── Transaksi mentah (format lama: items sebagai teks) ────────
export type TxInput = { id: string; date: string; time: string; items: string; total: number; cash: number; change: number; method: string }

export function validateTransaction(body: unknown): Valid<TxInput> {
  if (!isObj(body)) return { ok: false, error: 'Body harus berupa objek' }
  const id   = str(body.id,   'ID transaksi', { required: true, max: 40 })
  const date = str(body.date, 'Tanggal',      { required: true, max: 40 })
  const time = str(body.time, 'Jam',          { required: true, max: 20 })
  const items= str(body.items,'Item',         { required: true, max: 4000 })
  if (!id.ok) return id
  if (!date.ok) return date
  if (!time.ok) return time
  if (!items.ok) return items
  const total  = num(body.total,  'Total',     { min: 0, int: true }); if (!total.ok) return total
  const cash   = num(body.cash,   'Uang bayar',{ min: 0, int: true }); if (!cash.ok) return cash
  const change = num(body.change, 'Kembalian', { int: true });         if (!change.ok) return change
  const method = str(body.method ?? 'Cash', 'Metode', { max: 30 });    if (!method.ok) return method
  return { ok: true, value: {
    id: id.value, date: date.value, time: time.value, items: items.value,
    total: total.value, cash: cash.value, change: change.value, method: method.value || 'Cash',
  } }
}

// ─── Pelanggan ─────────────────────────────────────────────────
export function validateCustomer(body: unknown, partial = false): Valid<Record<string, unknown>> {
  if (!isObj(body)) return { ok: false, error: 'Body harus berupa objek' }
  const out: Record<string, unknown> = {}
  const has = (k: string) => body[k] !== undefined && body[k] !== null

  if (!partial || has('id')) {
    const r = str(body.id, 'ID pelanggan', { required: !partial, max: 30 }); if (!r.ok) return r
    if (r.value) out.id = r.value
  }
  if (!partial || has('name')) {
    const r = str(body.name, 'Nama pelanggan', { required: !partial, max: 120 }); if (!r.ok) return r
    out.name = r.value
  }
  for (const [k, label] of [['phone', 'No. telepon'], ['email', 'Email'], ['address', 'Alamat']] as const) {
    if (!partial || has(k)) {
      const r = str(body[k], label, { max: k === 'address' ? 300 : 120 }); if (!r.ok) return r
      out[k] = r.value
    }
  }
  if (has('prices')) {
    if (!Array.isArray(body.prices)) return { ok: false, error: 'Harga khusus harus berupa daftar' }
    if (body.prices.length > MAX_ITEMS) return { ok: false, error: 'Terlalu banyak harga khusus' }
    const prices = []
    for (let i = 0; i < body.prices.length; i++) {
      const p = body.prices[i]
      if (!isObj(p)) return { ok: false, error: `prices[${i}] tidak valid` }
      const name  = str(p.name,  `prices[${i}].nama`,  { required: true, max: 200 }); if (!name.ok) return name
      const size  = str(p.size,  `prices[${i}].ukuran`, { max: 60 });                 if (!size.ok) return size
      const unit  = str(p.unit,  `prices[${i}].satuan`, { max: 30 });                 if (!unit.ok) return unit
      const price = num(p.price, `prices[${i}].harga`, { min: 0 });                   if (!price.ok) return price
      let prodId: number | null = null
      if (p.prodId !== undefined && p.prodId !== null) {
        const r = num(p.prodId, `prices[${i}].prodId`, { min: 1, int: true }); if (!r.ok) return r
        prodId = r.value
      }
      prices.push({ prodId, name: name.value, size: size.value, unit: unit.value, price: price.value })
    }
    out.prices = prices
  }
  return { ok: true, value: out }
}

// ─── Invoice ───────────────────────────────────────────────────
export function validateInvoice(body: unknown, partial = false): Valid<Record<string, unknown>> {
  if (!isObj(body)) return { ok: false, error: 'Body harus berupa objek' }
  const out: Record<string, unknown> = {}
  const has = (k: string) => body[k] !== undefined && body[k] !== null

  const textFields: [string, string, boolean][] = [
    ['id',       'ID invoice',        !partial],
    ['cust_id',  'ID pelanggan',      false],
    ['cust_name','Nama pelanggan',    !partial],
    ['date',     'Tanggal',           !partial],
    ['due',      'Jatuh tempo',       !partial],
    ['status',   'Status',            !partial],
    ['note',     'Catatan',           false],
  ]
  for (const [k, label, required] of textFields) {
    if (!partial && !has(k) && !required) continue
    if (partial && !has(k)) continue
    const r = str(body[k], label, { required: partial ? false : required, max: k === 'note' ? 500 : 120 })
    if (!r.ok) return r
    if (r.value !== '') out[k] = r.value
  }
  if (out.status !== undefined && out.status !== 'Lunas' && out.status !== 'Belum Lunas') {
    return { ok: false, error: 'Status harus "Lunas" atau "Belum Lunas"' }
  }
  if (has('total')) {
    const r = num(body.total, 'Total', { min: 0, int: true }); if (!r.ok) return r
    out.total = r.value
  }
  if (has('items')) {
    if (!Array.isArray(body.items)) return { ok: false, error: 'Item invoice harus berupa daftar' }
    if (body.items.length === 0) return { ok: false, error: 'Invoice harus punya minimal 1 item' }
    if (body.items.length > MAX_ITEMS) return { ok: false, error: `Maksimal ${MAX_ITEMS} item per invoice` }
    const items = []
    for (let i = 0; i < body.items.length; i++) {
      const x = body.items[i]
      if (!isObj(x)) return { ok: false, error: `items[${i}] tidak valid` }
      const name  = str(x.name, `items[${i}].nama`,  { required: true, max: 200 }); if (!name.ok) return name
      const size  = str(x.size, `items[${i}].ukuran`, { max: 60 });                  if (!size.ok) return size
      const unit  = str(x.unit, `items[${i}].satuan`, { max: 30 });                  if (!unit.ok) return unit
      const qty   = num(x.qty,  `items[${i}].qty`,   { min: 0.001 });                if (!qty.ok) return qty
      const price = num(x.price,`items[${i}].harga`, { min: 0 });                    if (!price.ok) return price
      items.push({ name: name.value, size: size.value, qty: qty.value, unit: unit.value,
                   price: price.value, total: Math.round(price.value * qty.value) })
    }
    out.items = items
    // Total selalu dihitung ulang dari item — jangan percaya angka dari klien
    out.total = items.reduce((s, i) => s + i.total, 0)
  }
  return { ok: true, value: out }
}

// ─── Kategori ──────────────────────────────────────────────────
export function validateCategory(body: unknown): Valid<string> {
  if (!isObj(body)) return { ok: false, error: 'Body harus berupa objek' }
  return str(body.name, 'Nama kategori', { required: true, max: 60 })
}
