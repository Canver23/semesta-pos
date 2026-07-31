export interface SheetInfo {
  name: string
  rows: number
  cols: number
  headers: string[]
  data: any[][]
}

export interface DashboardMetrics {
  totalRevenue: number
  totalOrders: number
  totalQty: number
  revenueByDay: { date: string; revenue: number }[]
  courierDistribution: { name: string; count: number; color: string }[]
  topProducts: { name: string; qty: number }[]
  platformBreakdown: { platform: string; orders: number; revenue: number }
  // Weekly & daily data from Sheet3
  dailyData?: { date: string; transaksi: number; cancel: number; produk: number }[]
  weeklyData?: { week: string; transaksi: number; produk: number; laba: number }[]
  productRank?: { name: string; deal: number; cancel: number; total: number }[]
  summary?: { totalTransaksi: number; totalCancel: number; totalProduk: number; totalLaba: number }
}

const COURIER_COLORS: Record<string, string> = { 'SPX': '#EE4D2D', 'J&T': '#DC2626', 'AnterAja': '#2563EB', 'SiCepat': '#D97706', 'PAXEL': '#059669', 'JNE': '#7C3AED', 'Pos Indonesia': '#F59E0B', 'ID Express': '#0891B2' }

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

function getColor(name: string): string { return COURIER_COLORS[name] || '#6B7280' }

function safeNum(v: any, fallback = 0): number {
  if (v === null || v === undefined || v === '' || v === '-') return fallback
  return parseFloat(String(v)) || fallback
}

export function computeShopeeDashboard(sheets: SheetInfo[]): DashboardMetrics {
  const ordersSheet = sheets.find(s => s.name.toLowerCase().includes('order') && !s.name.toLowerCase().includes('sku'))
  if (!ordersSheet) return { totalRevenue: 0, totalOrders: 0, totalQty: 0, revenueByDay: [], courierDistribution: [], topProducts: [], platformBreakdown: { platform: 'Shopee', orders: 0, revenue: 0 } }

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
    totalQty += qty; totalRevenue += rev
    const dateKey = tglRaw.split(' ')[0]
    if (dateKey) revByDay.set(dateKey, (revByDay.get(dateKey) || 0) + rev)
    const courier = normalizeCourierName(opsi)
    courierMap.set(courier, (courierMap.get(courier) || 0) + 1)
    if (produk) productMap.set(produk, (productMap.get(produk) || 0) + qty)
  }

  return buildResult(totalRevenue, rows.length, totalQty, revByDay, courierMap, productMap, 'Shopee')
}

export function computeTokopediaDashboard(sheets: SheetInfo[]): DashboardMetrics {
  const skuSheet = sheets.find(s => s.name.toLowerCase().includes('order') && s.name.toLowerCase().includes('sku'))
  if (!skuSheet) return { totalRevenue: 0, totalOrders: 0, totalQty: 0, revenueByDay: [], courierDistribution: [], topProducts: [], platformBreakdown: { platform: 'TikTok/Tokopedia', orders: 0, revenue: 0 } }

  const rows = skuSheet.data
  let totalRevenue = 0, totalQty = 0
  const revByDay = new Map<string, number>()
  const courierMap = new Map<string, number>()
  const productMap = new Map<string, number>()
  const seenOrders = new Set<string>()

  for (const row of rows) {
    const orderId = String(row[0] || '')
    if (!orderId) continue; seenOrders.add(orderId)
    const qty = parseInt(String(row[9] || '0')) || 1
    const amount = parseFloat(String(row[28] || String(row[27] || '0'))) || 0
    const delivery = String(row[41] || '')
    const produk = String(row[7] || '')
    const tglRaw = String(row[29] || '')
    totalQty += qty; totalRevenue += amount
    const dateKey = tglRaw.split(' ')[0]
    if (dateKey) revByDay.set(dateKey, (revByDay.get(dateKey) || 0) + amount)
    courierMap.set(normalizeCourierName(delivery), (courierMap.get(normalizeCourierName(delivery)) || 0) + 1)
    if (produk) productMap.set(produk, (productMap.get(produk) || 0) + qty)
  }

  const baseResult = buildResult(totalRevenue, seenOrders.size || rows.length, totalQty, revByDay, courierMap, productMap, 'TikTok/Tokopedia')

  // Extract Sheet3 weekly data
  const sheet3 = sheets.find(s => s.name === 'Sheet3')
  if (sheet3) {
    const sdata = sheet3.data as any[][]
    const weeklyData = extractWeeklyData(sdata)
    const dailyData = extractDailyData(sdata)
    const productRank = extractProductRank(sdata)
    const summary = extractSummary(sdata)
    return { ...baseResult, dailyData, weeklyData, productRank, summary }
  }

  return baseResult
}

function extractDailyData(sdata: any[][]): { date: string; transaksi: number; cancel: number; produk: number }[] {
  const result: { date: string; transaksi: number; cancel: number; produk: number }[] = []
  if (sdata.length < 6) return result
  const dates = [26, 27, 28, 29, 30, 31]
  for (let i = 0; i < dates.length; i++) {
    result.push({
      date: String(dates[i]),
      transaksi: safeNum(sdata[2]?.[i + 1]),
      cancel: safeNum(sdata[3]?.[i + 1]),
      produk: safeNum(sdata[4]?.[i + 1]),
    })
  }
  return result
}

function extractWeeklyData(sdata: any[][]): { week: string; transaksi: number; produk: number; laba: number }[] {
  const result: { week: string; transaksi: number; produk: number; laba: number }[] = []
  const weekLabels = ['WEEK-1', 'WEEK-2', 'WEEK-3', 'WEEK-4', 'WEEK-5']
  const transCols = [3, 4, 5, 6, 7] // B-F in weekly summary row

  // Row 6: "WEEK-1" to "WEEK-5"
  // Row 7: "JML TRANSAKSI" with weekly values
  // Row 9: "JML PRODUK YANG DIBELI"
  // Row 15: "LABA"

  for (let i = 0; i < 5; i++) {
    const col = i + 1 // B=1, C=2, etc in the WEEK-X row labels
    result.push({
      week: String(sdata[6]?.[col] || weekLabels[i]),
      transaksi: safeNum(sdata[7]?.[col]),
      produk: safeNum(sdata[9]?.[col] || sdata[10]?.[col]),
      laba: safeNum(sdata[15]?.[col]),
    })
  }
  return result.filter(w => w.week && w.week !== 'null')
}

function extractProductRank(sdata: any[][]): { name: string; deal: number; cancel: number; total: number }[] {
  const result: { name: string; deal: number; cancel: number; total: number }[] = []
  for (let i = 2; i < Math.min(sdata.length, 39); i++) {
    const row = sdata[i]
    if (!row || !row[18]) continue
    const name = String(row[18] || '').trim()
    if (!name || name === 'DEAL' || name === 'PRODUK') continue
    const deal = safeNum(row[19])
    const cancel = safeNum(row[20])
    const total = safeNum(row[21])
    if (total <= 0) continue
    result.push({ name, deal, cancel, total })
  }
  return result.sort((a, b) => b.total - a.total)
}

function extractSummary(sdata: any[][]): { totalTransaksi: number; totalCancel: number; totalProduk: number; totalLaba: number } {
  let totalTransaksi = 0, totalCancel = 0, totalProduk = 0, totalLaba = 0
  for (let i = 1; i <= 5; i++) {
    totalTransaksi += safeNum(sdata[7]?.[i])
    totalCancel += safeNum(sdata[8]?.[i])
    totalProduk += safeNum(sdata[9]?.[i] || sdata[10]?.[i])
    totalLaba += safeNum(sdata[15]?.[i])
  }
  return { totalTransaksi, totalCancel, totalProduk, totalLaba }
}

function buildResult(
  revenue: number, orders: number, qty: number,
  revByDay: Map<string, number>, courierMap: Map<string, number>,
  productMap: Map<string, number>, platform: string,
): DashboardMetrics {
  return {
    totalRevenue: Math.round(revenue),
    totalOrders: orders,
    totalQty: qty,
    revenueByDay: Array.from(revByDay.entries()).map(([date, revenue]) => ({ date, revenue: Math.round(revenue) })).sort((a, b) => a.date.localeCompare(b.date)),
    courierDistribution: Array.from(courierMap.entries()).map(([name, count]) => ({ name, count, color: getColor(name) })).sort((a, b) => b.count - a.count),
    topProducts: Array.from(productMap.entries()).map(([name, qty]) => ({ name: name.substring(0, 60), qty })).sort((a, b) => b.qty - a.qty).slice(0, 10),
    platformBreakdown: { platform, orders, revenue: Math.round(revenue) },
  }
}
