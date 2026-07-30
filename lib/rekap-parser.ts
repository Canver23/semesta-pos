export interface RecipientEntry { name: string; marketplace: 'TP' | 'SP' }
export interface CourierGroup { courier: string; short: string; recipients: RecipientEntry[] }
export interface PdfLabel { courier: string; courierShort: string; recipientName: string; marketplace: 'TP' | 'SP' | null }

const COURIERS: { name: string; short: string; patterns: RegExp[] }[] = [
  { name: 'AnterAja', short: 'AA', patterns: [/anteraja/i] },
  { name: 'J&T', short: 'J&T', patterns: [/j&t/i] },
  { name: 'SPX', short: 'SPX', patterns: [/spx/i] },
  { name: 'SiCepat', short: 'SiCepat', patterns: [/sicepat/i] },
  { name: 'JNE', short: 'JNE', patterns: [/jne/i] },
  { name: 'Pos Indonesia', short: 'Pos', patterns: [/pos indonesia/i] },
  { name: 'ID Express', short: 'IDX', patterns: [/id express/i] },
  { name: 'Ninja', short: 'Ninja', patterns: [/ninjavan/i] },
]

function normalizeLine(line: string): string {
  const parts = line.split(/\s+/)
  if (parts.length >= 4 && parts.every(p => p.length <= 3)) {
    return parts.join('')
  }
  return line
}

function detectCourier(text: string): { name: string; short: string } | null {
  const fl = text.split('\n')[0].trim()
  if (/^(?:NDD|EZ)$/i.test(fl)) return { name: 'J&T', short: 'J&T' }
  if (/^(?:ECO|STD)$/i.test(fl)) return { name: 'SPX', short: 'SPX' }
  if (/^(?:REG|SD)$/i.test(fl)) return { name: 'AnterAja', short: 'AA' }
  if (/^(?:HOME)$/i.test(fl)) return { name: 'SPX', short: 'SPX' }
  if (/^(?:FastTrack)$/i.test(fl)) return { name: 'J&T', short: 'J&T' }
  if (/\bSAMEDAY\b/i.test(text)) return { name: 'AnterAja', short: 'AA' }
  if (/\bJY\d{8,}\b/.test(text)) return { name: 'J&T', short: 'J&T' }
  if (/\bTSA-?\d{8,}\b/.test(text)) return { name: 'SiCepat', short: 'SiCepat' }
  if (/CASHLESS|No\.?\s*Resi\s*:?\s*\d{12,}/i.test(text)) return { name: 'AnterAja', short: 'AA' }
  if (/spexpress|spx|shopee express/i.test(text)) return { name: 'SPX', short: 'SPX' }
  if (/jet\.co\.id|\bjnt\b|j&t/i.test(text)) return { name: 'J&T', short: 'J&T' }
  if (/sicepat|si cepat/i.test(text)) return { name: 'SiCepat', short: 'SiCepat' }
  if (/\bjne\b|jalur nugraha/i.test(text)) return { name: 'JNE', short: 'JNE' }
  if (/pos indonesia|pt pos/i.test(text)) return { name: 'Pos Indonesia', short: 'Pos' }
  if (/id express|idexpress/i.test(text)) return { name: 'ID Express', short: 'IDX' }
  if (/ninja van|ninjavan/i.test(text)) return { name: 'Ninja', short: 'Ninja' }
  return null
}

function detectMarketplace(text: string): 'TP' | 'SP' | null {
  if (/TTOrderID|tt.order.id|ttorderid/i.test(text)) return 'TP'
  if (/tiktokshop|tiktok shop/i.test(text)) return 'TP'
  if (/\bNo\s*\.?\s*Pesanan\s*:/i.test(text)) return 'SP'
  if (/shopee/i.test(text)) return 'SP'
  if (/tokopedia/i.test(text)) return 'TP'
  if (/\bShip\s*:/i.test(text)) return 'TP'
  return null
}

function hasDigits(s: string, min: number = 6): boolean {
  return s.replace(/\D/g, '').length >= min
}

const SKIP = /^(TokoPlastikSemesta|Toko\s*Plastik\s*Semesta|Pengirim|Penerima|Jawa|Jalan|Jl|DKI|BANTEN|COD|CASHLESS|Weight|Ship|Order|Product|Print|No|Syarat|SKU|Qty|Nama|Berat|KOTA|KAB|RT|Dusun|Barang|Default|Batas|Nick|Pasar|Kompleks|Penjual|Ruko|CHEFFY|Polynet|Tali|CASHLESS|BATAS|GRADE|STRETCH|FILM|WRAP|WRAPPING|PEMBUNGKUS|MAKANAN|MET|ROLL|NDD|ECO|REG|STD|EZ|HOME|SD|COD|SAMEDAY|FastTrack|EstimatedDate|Jumlah|Weight|Ship|QtyTotal|TTOrderID|NoResi|NickName|OrderID|ProductName|Intransitby|Berat|BatasKirim|No\.Pesanan|Pamokolan|Cihaurbeuti|CIAMIS|BANDUNG|JAKARTA|MAMPANG|PRAPATAN|BALARAJA|Ciparay|Induk|Caringin|Coblong|imam|bonjol|perempatan|GNI|blora|jaten|Kartawijaya|Teluk|Warung|Naga|Shasa|Salad|Garuda)\b/i

const SKIP_CONTAINS = /(?:PLASTIC|FOOD|GRADE|METER|ROLL|POLYNET|WARING|RAMBANG|JARING|BUAH|PANJANG|RAFIA|GALAKSI|IKAT|KUAT|TEBAL|SERBAGUNA|STRETCH|PLASTIK|FILM|PEMBUNGKUS|MAKANAN|CHEFFY|TALI|POLYNET|CM\s*[Xx]|MET(?:ER|RE)?\b|[Kk][Gg]\b|[Gg][Rr]\b|[Pp][Cc][Ss]\b)/i

function isName(s: string): boolean {
  const t = s.trim()
  if (!t || t.length < 2 || t.length > 60) return false
  if (/^[\s\d.,()+\-*/:;|]+$/.test(t)) return false
  if (hasDigits(t)) return false
  if (SKIP.test(t)) return false
  if (SKIP_CONTAINS.test(t)) return false
  if (/^\d+[\s/]*(gr|kg|pcs|g|roll|meter|cm|mm|KG)/i.test(t)) return false
  return true
}

function extractNames(lines: string[]): string[] {
  const names: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!/^Penerima\s*:?\s*$|^Penerima\s*:?\s*(.+)/i.test(line)) continue

    const m = line.match(/^Penerima\s*:?\s*(.+)/i)
    if (m?.[1]) {
      const val = m[1].trim()
      if (isName(val)) { names.push(val); continue }
    }

    for (let j = 1; j < 30; j++) {
      if (i + j < lines.length) {
        const c = lines[i + j].trim()
        if (!c) continue
        if (hasDigits(c)) continue
        if (isName(c)) { names.push(c); break }
      }
    }
  }

  return names
}

export function parseLabelText(text: string): PdfLabel[] {
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (rawLines.length < 3) return []

  const lines = rawLines.map(normalizeLine)
  const joined = lines.join('\n')

  const courier = detectCourier(joined)
  if (!courier) return []

  const isCargo = /^(?:FastTrack)$/i.test(lines[0])

  const directNames = extractNames(lines)
  if (directNames.length === 0) return []

  let marketplace = detectMarketplace(joined)
  if (!marketplace && courier.short === 'SPX') marketplace = 'SP'
  if (!marketplace) marketplace = 'TP'

  return directNames.map(name => ({
    courier: courier.name,
    courierShort: courier.short,
    recipientName: isCargo ? `Cargo - ${name}` : name,
    marketplace,
  }))
}

export function parseRecap(labels: PdfLabel[]): {
  groups: CourierGroup[]
  summary: { TP: number; SP: number; total: number }
} {
  const map = new Map<string, RecipientEntry[]>()
  for (const label of labels) {
    const key = label.courierShort
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push({ name: label.recipientName, marketplace: label.marketplace || 'TP' })
  }

  const order = ['AA', 'J&T', 'SPX', 'SiCepat', 'JNE', 'Pos', 'IDX', 'Ninja']
  const groups: CourierGroup[] = []
  for (const short of order) {
    const recipients = map.get(short)
    if (recipients?.length) {
      groups.push({ courier: COURIERS.find(c => c.short === short)?.name ?? short, short, recipients })
      map.delete(short)
    }
  }
  for (const [short, recipients] of map) groups.push({ courier: short, short, recipients })

  let TP = 0, SP = 0
  for (const g of groups) for (const r of g.recipients) { if (r.marketplace === 'TP') TP++; else SP++ }
  return { groups, summary: { TP, SP, total: TP + SP } }
}
