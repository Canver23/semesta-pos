export interface SheetInfo {
  name: string; rows: number; cols: number; headers: string[]; data: any[][]
}

export interface DashboardMetrics {
  // Legacy
  totalRevenue?: number; totalOrders?: number; totalQty?: number
  revenueByDay?: { date: string; revenue: number }[]
  courierDistribution?: { name: string; count: number; color: string }[]
  topProducts?: { name: string; qty: number }[]
  platformBreakdown: { platform: string; orders: number; revenue: number }
  // 1. Keseluruhan
  overall: { dealTransaksi: number; cancelTransaksi: number; totalTransaksi: number; qtyItem: number; laba: number }
  // 2. Jumlah Transaksi
  dailyTransaksi: { date: string; deal: number; cancel: number }[]
  weeklyTransaksi: { week: string; deal: number; cancel: number; total: number }[]
  // 3. Laba
  weeklyLaba: { week: string; laba: number; cumulative: number; paid: string }[]
  // 4. Kualitas Pembelian
  productRanks: { name: string; deal: number; cancel: number; total: number }[]
  // 5. Resume Metode Pembayaran
  paymentByWeek: { week: string; codTransaksi: number; codQty: number }[]
  // 6. Kuantitas Produk Terjual
  qtyByWeek: { week: string; qty: number }[]
}

const COURIER_COLORS: Record<string, string> = { 'SPX': '#EE4D2D', 'J&T': '#DC2626', 'AnterAja': '#2563EB', 'SiCepat': '#D97706', 'PAXEL': '#059669', 'JNE': '#7C3AED' }

function safeNum(v: any, fallback = 0): number {
  if (v === null || v === undefined || v === '' || v === '-') return fallback
  return parseFloat(String(v)) || fallback
}

function normalizeCourierName(opsi: string): string {
  const o = opsi.toLowerCase()
  if (o.includes('spx')) return 'SPX'
  if (o.includes('j&t') || o.includes('jnt') || o.includes('jet')) return 'J&T'
  if (o.includes('anteraja') || o.includes('anter aja')) return 'AnterAja'
  if (o.includes('sicepat')) return 'SiCepat'
  if (o.includes('paxel')) return 'PAXEL'
  if (o.includes('jne')) return 'JNE'
  return 'Lainnya'
}

function getColor(name: string): string { return COURIER_COLORS[name] || '#6B7280' }

function buildBaseResult(
  revenue: number, orders: number, qty: number,
  revByDay: Map<string, number>, courierMap: Map<string, number>,
  productMap: Map<string, number>, platform: string,
) {
  return {
    totalRevenue: Math.round(revenue), totalOrders: orders, totalQty: qty,
    revenueByDay: Array.from(revByDay.entries()).map(([d, r]) => ({ date: d, revenue: Math.round(r) })).sort((a, b) => a.date.localeCompare(b.date)),
    courierDistribution: Array.from(courierMap.entries()).map(([n, c]) => ({ name: n, count: c, color: getColor(n) })).sort((a, b) => b.count - a.count),
    topProducts: Array.from(productMap.entries()).map(([n, q]) => ({ name: n.substring(0, 60), qty: q })).sort((a, b) => b.qty - a.qty).slice(0, 10),
    platformBreakdown: { platform, orders, revenue: Math.round(revenue) },
  }
}

export function computeShopeeDashboard(sheets: SheetInfo[]): DashboardMetrics {
  const s = sheets.find(sh => sh.name.toLowerCase().includes('order') && !sh.name.toLowerCase().includes('sku'))
  if (!s) return emptyDash('Shopee')
  const rows = s.data; let rev = 0, qty = 0
  const rbd = new Map<string, number>(); const cm = new Map<string, number>(); const pm = new Map<string, number>()
  for (const row of rows) {
    const st = String(row[1] || ''); if (st === 'Dibatalkan') continue
    const q = parseInt(String(row[18] || '0')) || 1; const r = safeNum(row[38])
    qty += q; rev += r; const d = String(row[49] || row[48] || '').split(' ')[0]
    if (d) rbd.set(d, (rbd.get(d) || 0) + r)
    cm.set(normalizeCourierName(String(row[5] || '')), (cm.get(normalizeCourierName(String(row[5] || ''))) || 0) + 1)
    const p = String(row[13] || ''); if (p) pm.set(p, (pm.get(p) || 0) + q)
  }
  return { overall: emptyOverall(), dailyTransaksi: [], weeklyTransaksi: [], weeklyLaba: [], productRanks: [], paymentByWeek: [], qtyByWeek: [], ...buildBaseResult(rev, rows.length, qty, rbd, cm, pm, 'Shopee'), platformBreakdown: { platform: 'Shopee', orders: rows.length, revenue: Math.round(rev) } }
}

export function computeTokopediaDashboard(sheets: SheetInfo[]): DashboardMetrics {
  const sku = sheets.find(sh => sh.name.toLowerCase().includes('order') && sh.name.toLowerCase().includes('sku'))
  if (!sku) return emptyDash('TikTok/Tokopedia')
  const rows = sku.data; let rev = 0, qty = 0; const so = new Set<string>()
  const rbd = new Map<string, number>(); const cm = new Map<string, number>(); const pm = new Map<string, number>()
  for (const row of rows) {
    const oid = String(row[0] || ''); if (!oid) continue; so.add(oid)
    const q = parseInt(String(row[9] || '0')) || 1; const r = safeNum(row[28] || row[27])
    qty += q; rev += r; const d = String(row[29] || '').split(' ')[0]
    if (d) rbd.set(d, (rbd.get(d) || 0) + r)
    cm.set(normalizeCourierName(String(row[41] || '')), (cm.get(normalizeCourierName(String(row[41] || ''))) || 0) + 1)
    const p = String(row[7] || ''); if (p) pm.set(p, (pm.get(p) || 0) + q)
  }
  const base = buildBaseResult(rev, so.size || rows.length, qty, rbd, cm, pm, 'TikTok/Tokopedia')

  const s3 = sheets.find(sh => sh.name === 'Sheet3')
  if (!s3) return { overall: emptyOverall(), dailyTransaksi: [], weeklyTransaksi: [], weeklyLaba: [], productRanks: [], paymentByWeek: [], qtyByWeek: [], ...base, platformBreakdown: { platform: 'TikTok/Tokopedia', orders: so.size || rows.length, revenue: Math.round(rev) } }

  const d = s3.data as any[][]

  // Labels
  const weekLabels = ['WEEK-1', 'WEEK-2', 'WEEK-3', 'WEEK-4', 'WEEK-5']
  const dayLabels = ['26', '27', '28', '29', '30', '31']

  // Overall (from weekly data)
  const overall = {
    dealTransaksi: safeNum(d[7]?.[1]) + safeNum(d[7]?.[2]) + safeNum(d[7]?.[3]) + safeNum(d[7]?.[4]) + safeNum(d[7]?.[5]),
    cancelTransaksi: safeNum(d[8]?.[1]) + safeNum(d[8]?.[2]) + safeNum(d[8]?.[3]) + safeNum(d[8]?.[4]) + safeNum(d[8]?.[5]),
    totalTransaksi: safeNum(d[9]?.[1]) + safeNum(d[9]?.[2]) + safeNum(d[9]?.[3]) + safeNum(d[9]?.[4]) + safeNum(d[9]?.[5]),
    qtyItem: safeNum(d[10]?.[1]) + safeNum(d[10]?.[2]) + safeNum(d[10]?.[3]) + safeNum(d[10]?.[4]) + safeNum(d[10]?.[5]),
    laba: safeNum(d[15]?.[1]) + safeNum(d[15]?.[2]) + safeNum(d[15]?.[3]) + safeNum(d[15]?.[4]) + safeNum(d[15]?.[5]),
  }

  // Daily transaksi (row 2 = deal, row 3 = cancel)
  const dailyTransaksi = dayLabels.map((dt, i) => ({
    date: dt,
    deal: safeNum(d[2]?.[i + 1]),
    cancel: safeNum(d[3]?.[i + 1]),
  }))

  // Weekly transaksi (row 7 = deal, row 8 = cancel, row 10 = kuantitas total)
  const weeklyTransaksi = weekLabels.map((wl, i) => ({
    week: wl,
    deal: safeNum(d[7]?.[i + 1]),
    cancel: safeNum(d[8]?.[i + 1]),
    total: safeNum(d[9]?.[i + 1]),
  }))

  // Laba with cumulative
  const weeklyLaba: { week: string; laba: number; cumulative: number; paid: string }[] = []
  let cumLaba = 0
  for (let i = 0; i < 5; i++) {
    cumLaba += safeNum(d[15]?.[i + 1])
    weeklyLaba.push({
      week: weekLabels[i],
      laba: safeNum(d[15]?.[i + 1]),
      cumulative: cumLaba,
      paid: String(d[16]?.[i + 1] || ''),
    })
  }

  // Product ranks (rows 2-39, cols 18-21)
  const productRanks: { name: string; deal: number; cancel: number; total: number }[] = []
  for (let i = 2; i < Math.min(d.length, 39); i++) {
    const row = d[i]; if (!row?.[18]) continue
    const name = String(row[18]).trim()
    if (!name || name === 'DEAL' || name === 'PRODUK') continue
    const deal = safeNum(row[19]); const cancel = safeNum(row[20]); const total = safeNum(row[21])
    if (total <= 0) continue
    productRanks.push({ name, deal, cancel, total })
  }

  // Payment (row 12/13 per week)
  const paymentByWeek = weekLabels.map((wl, i) => ({
    week: wl,
    codTransaksi: safeNum(d[12]?.[i + 1]),
    codQty: safeNum(d[12]?.[i + 1]),
  }))

  // Qty by week (row 10)
  const qtyByWeek = weekLabels.map((wl, i) => ({
    week: wl,
    qty: safeNum(d[10]?.[i + 1]),
  }))

  return {
    overall, dailyTransaksi, weeklyTransaksi, weeklyLaba, productRanks, paymentByWeek, qtyByWeek,
    ...base,
    platformBreakdown: { platform: 'TikTok/Tokopedia', orders: so.size || rows.length, revenue: Math.round(rev) },
  }
}

function emptyDash(platform: string): DashboardMetrics {
  return {
    overall: emptyOverall(), dailyTransaksi: [], weeklyTransaksi: [], weeklyLaba: [], productRanks: [], paymentByWeek: [], qtyByWeek: [],
    totalRevenue: 0, totalOrders: 0, totalQty: 0, revenueByDay: [], courierDistribution: [], topProducts: [],
    platformBreakdown: { platform, orders: 0, revenue: 0 },
  }
}

function emptyOverall() { return { dealTransaksi: 0, cancelTransaksi: 0, totalTransaksi: 0, qtyItem: 0, laba: 0 } }
