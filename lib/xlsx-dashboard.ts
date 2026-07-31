export interface SheetInfo {
  name: string
  rows: number
  cols: number
  headers: string[]
  data: any[][]
}

// Shopee: orders sheet
// col 0=No.Pesanan, 1=Status, 4=No.Resi, 5=Opsi Pengiriman, 13=Nama Produk, 18=Qty, 38=Total Pembayaran, 43=Nama Penerima, 49=tgl Selesai

// Tokopedia: OrderSKUList sheet
// col 0=Order ID, 1=Status, 38=TrackingID, 41=DeliveryOption, 7=ProductName, 9=Qty, 25=NamaPenerima, 34=tgl? (CreatedTime)

export interface DashboardMetrics {
  totalRevenue: number
  totalOrders: number
  totalQty: number
  revenueByDay: { date: string; revenue: number }[]
  courierDistribution: { name: string; count: number; color: string }[]
  topProducts: { name: string; qty: number }[]
  platformBreakdown: { platform: string; orders: number; revenue: number }
}

const COURIER_COLORS: Record<string, string> = {
  'SPX': '#EE4D2D', 'J&T': '#DC2626', 'AnterAja': '#2563EB',
  'SiCepat': '#D97706', 'PAXEL': '#059669', 'JNE': '#7C3AED',
  'Pos Indonesia': '#F59E0B', 'ID Express': '#0891B2',
}

function normalizeCourierName(opsi: string): string {
  const o = opsi.toLowerCase()
  if (o.includes('spx')) return 'SPX'
  if (o.includes('j&t') || o.includes('jnt') || o.includes('jet')) return 'J&T'
  if (o.includes('anteraja') || o.includes('anter aja')) return 'AnterAja'
  if (o.includes('sicepat')) return 'SiCepat'
  if (o.includes('paxel')) return 'PAXEL'
  if (o.includes('jne')) return 'JNE'
  if (o.includes('pos')) return 'Pos Indonesia'
  if (o.includes('id express')) return 'ID Express'
  return 'Lainnya'
}

function getColor(name: string): string {
  return COURIER_COLORS[name] || '#6B7280'
}

export function computeShopeeDashboard(sheets: SheetInfo[]): DashboardMetrics {
  const ordersSheet = sheets.find(s => s.name.toLowerCase().includes('order'))
  if (!ordersSheet) {
    return { totalRevenue: 0, totalOrders: 0, totalQty: 0, revenueByDay: [], courierDistribution: [], topProducts: [], platformBreakdown: { platform: 'Shopee', orders: 0, revenue: 0 } }
  }

  const rows = ordersSheet.data
  let totalRevenue = 0, totalQty = 0
  const revByDay = new Map<string, number>()
  const courierMap = new Map<string, number>()
  const productMap = new Map<string, number>()

  for (const row of rows) {
    const status = String(row[1] || '')
    if (status === 'Dibatalkan' || status === 'Tidak Selesai') continue

    const qty = parseInt(String(row[18] || '0')) || 1
    const rev = parseFloat(String(row[38] || '0')) || 0
    const opsi = String(row[5] || '')
    const produk = String(row[13] || '')
    const tglRaw = String(row[49] || row[48] || '')

    totalQty += qty
    totalRevenue += rev

    const dateKey = tglRaw.split(' ')[0]
    if (dateKey) revByDay.set(dateKey, (revByDay.get(dateKey) || 0) + rev)

    const courier = normalizeCourierName(opsi)
    courierMap.set(courier, (courierMap.get(courier) || 0) + 1)

    if (produk) productMap.set(produk, (productMap.get(produk) || 0) + qty)
  }

  return {
    totalRevenue: Math.round(totalRevenue),
    totalOrders: rows.length,
    totalQty,
    revenueByDay: Array.from(revByDay.entries()).map(([date, revenue]) => ({ date, revenue: Math.round(revenue) })).sort((a, b) => a.date.localeCompare(b.date)),
    courierDistribution: Array.from(courierMap.entries()).map(([name, count]) => ({ name, count, color: getColor(name) })).sort((a, b) => b.count - a.count),
    topProducts: Array.from(productMap.entries()).map(([name, qty]) => ({ name: name.substring(0, 60), qty })).sort((a, b) => b.qty - a.qty).slice(0, 10),
    platformBreakdown: { platform: 'Shopee', orders: rows.length, revenue: Math.round(totalRevenue) },
  }
}

export function computeTokopediaDashboard(sheets: SheetInfo[]): DashboardMetrics {
  const skuSheet = sheets.find(s => s.name.toLowerCase().includes('order') && s.name.toLowerCase().includes('sku'))
  if (!skuSheet) {
    return { totalRevenue: 0, totalOrders: 0, totalQty: 0, revenueByDay: [], courierDistribution: [], topProducts: [], platformBreakdown: { platform: 'TikTok/Tokopedia', orders: 0, revenue: 0 } }
  }

  const rows = skuSheet.data
  let totalRevenue = 0, totalQty = 0, totalOrders = 0
  const revByDay = new Map<string, number>()
  const courierMap = new Map<string, number>()
  const productMap = new Map<string, number>()
  const seenOrders = new Set<string>()

  for (const row of rows) {
    const orderId = String(row[0] || '')
    if (!orderId) continue
    seenOrders.add(orderId)

    const qty = parseInt(String(row[9] || '0')) || 1
    const amount = parseFloat(String(row[28] || String(row[27] || '0'))) || 0
    const delivery = String(row[41] || '')
    const produk = String(row[7] || '')
    const tglRaw = String(row[29] || '')

    totalQty += qty
    totalRevenue += amount

    const dateKey = tglRaw.split(' ')[0]
    if (dateKey) revByDay.set(dateKey, (revByDay.get(dateKey) || 0) + amount)

    const courier = normalizeCourierName(delivery)
    courierMap.set(courier, (courierMap.get(courier) || 0) + 1)

    if (produk) productMap.set(produk, (productMap.get(produk) || 0) + qty)
  }

  return {
    totalRevenue: Math.round(totalRevenue),
    totalOrders: seenOrders.size || rows.length,
    totalQty,
    revenueByDay: Array.from(revByDay.entries()).map(([date, revenue]) => ({ date, revenue: Math.round(revenue) })).sort((a, b) => a.date.localeCompare(b.date)),
    courierDistribution: Array.from(courierMap.entries()).map(([name, count]) => ({ name, count, color: getColor(name) })).sort((a, b) => b.count - a.count),
    topProducts: Array.from(productMap.entries()).map(([name, qty]) => ({ name: name.substring(0, 60), qty })).sort((a, b) => b.qty - a.qty).slice(0, 10),
    platformBreakdown: { platform: 'TikTok/Tokopedia', orders: seenOrders.size || rows.length, revenue: Math.round(totalRevenue) },
  }
}
