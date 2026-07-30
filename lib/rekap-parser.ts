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

function fixSpacedWords(text: string): string {
  const pairs: [RegExp, string][] = [
    [/\bP\s+e\s+n\s+g\s+i\s+r\s+i\s+m\b/gi, 'Pengirim'],
    [/\bP\s+e\s+n\s+e\s+r\s+i\s+m\s+a\b/gi, 'Penerima'],
    [/\bT\s+o\s+k\s+o\s+P\s+l\s+a\s+s\s+t\s+i\s+k\s+S\s+e\s+m\s+e\s+s\s+t\s+a\b/gi, 'TokoPlastikSemesta'],
    [/\bN\s+i\s+c\s+k\s+N\s+a\s+m\s+e\b/gi, 'NickName'],
    [/\bN\s+o\s*\.\s*\s*P\s+e\s+s\s+a\s+n\s+a\s+n\b/gi, 'No.Pesanan'],
    [/\bN\s+o\s*\.\s*\s*R\s+e\s+s\s+i\b/gi, 'No.Resi'],
    [/\bO\s+r\s+d\s+e\s+r\s*I\s*[Dd]\b/gi, 'OrderID'],
    [/\bP\s+r\s+o\s+d\s+u\s+c\s+t\s+N\s+a\s+m\s+e\b/gi, 'ProductName'],
    [/\bP\s+r\s+i\s+n\s+t\s+T\s+i\s+m\s+e\b/gi, 'PrintTime'],
    [/\bC\s+A\s+S\s+H\s+L\s+E\s+S\s+S\b/gi, 'CASHLESS'],
    [/\bS\s+A\s+M\s+E\s+D\s+A\s+Y\b/gi, 'SAMEDAY'],
    [/\bF\s+a\s+s\s+t\s+T\s+r\s+a\s+c\s+k\b/gi, 'FastTrack'],
    [/\bW\s+e\s+i\s+g\s+h\s+t\b/gi, 'Weight'],
    [/\bS\s+h\s+i\s+p\b/gi, 'Ship'],
    [/\bS\s+K\s+U\b/gi, 'SKU'],
    [/\bQ\s+t\s+y\b/gi, 'Qty'],
    [/\bR\s+E\s+G\b/gi, 'REG'],
    [/\bE\s+C\s+O\b/gi, 'ECO'],
    [/\bN\s+D\s+D\b/gi, 'NDD'],
    [/\bE\s+Z\b/gi, 'EZ'],
    [/\bS\s+T\s+D\b/gi, 'STD'],
    [/\bS\s+D\b/gi, 'SD'],
    [/\bH\s+O\s+M\s+E\b/gi, 'HOME'],
    [/\bC\s+O\s+D\b/gi, 'COD'],
    [/\bT\s+T\s+O\s+r\s+d\s+e\s+r\s*I\s*[Dd]\b/gi, 'TTOrderID'],
  ]
  let r = text
  for (const [rx, rep] of pairs) r = r.replace(rx, rep)
  return r
}

function detectCourier(text: string): { name: string; short: string } | null {
  const fl = text.split('\n')[0].trim()
  if (/^(?:NDD|EZ)$/i.test(fl)) return { name: 'J&T', short: 'J&T' }
  if (/^(?:ECO|STD)$/i.test(fl)) return { name: 'SPX', short: 'SPX' }
  if (/^(?:REG|SD)$/i.test(fl)) return { name: 'AnterAja', short: 'AA' }
  if (/^(?:HOME|FastTrack)$/i.test(fl)) return { name: 'SPX', short: 'SPX' }
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
  if (/TTOrderID/i.test(text)) return 'TP'
  if (/tiktokshop|tiktok shop/i.test(text.toLowerCase())) return 'TP'
  if (/No\.Pesanan\s*:/i.test(text)) return 'SP'
  if (/shopee/i.test(text.toLowerCase())) return 'SP'
  if (/tokopedia/i.test(text.toLowerCase())) return 'TP'
  if (/Ship\s*:/i.test(text)) return 'TP'
  return null
}

function hasDigits(s: string, min: number = 6): boolean {
  const d = s.replace(/\D/g, '')
  return d.length >= min
}

function looksLikePhone(s: string): boolean {
  const d = s.replace(/[()+\-.\s]/g, '')
  if (/^62\d{6,}$/.test(d)) return true
  if (/^\d{7,}$/.test(d)) return true
  return false
}

const SKIP = /^(TokoPlastikSemesta|Pengirim|Penerima|Jawa|Jalan|Jl|DKI|BANTEN|COD|CASHLESS|Weight|Ship|Order|Product|Print|No|Syarat|SKU|Qty|Nama|Berat|KOTA|KAB|RT|Dusun|Barang|Default|Batas|Nick|Pasar|Kompleks|Penjual|Ruko|CHEFFY|Polynet|Tali|CASHLESS|BATAS|GRADE|STRETCH|FILM|WRAP|WRAPPING|PEMBUNGKUS|MAKANAN|MET|ROLL|NDD|ECO|REG|STD|EZ|HOME|SD|COD|SAMEDAY|FastTrack|EstimatedDate|Jumlah|Weight|Ship|QtyTotal|TTOrderID|NoResi|NickName|OrderID|ProductName|Intransitby|Berat|BatasKirim|No\.Pesanan|Pamokolan|Cihaurbeuti|CIAMIS|BANDUNG|JAKARTA|MAMPANG|PRAPATAN|BALARAJA|Ciparay|Induk|Caringin|Coblong|imam|bonjol|perempatan|GNI|blora|jaten|Kartawijaya|Teluk|Warung|Naga|Shasa|Salad|Garuda)\b/i

function isName(s: string): boolean {
  const t = s.trim()
  if (!t || t.length < 2 || t.length > 60) return false
  if (/^[\s\d.,()+\-*/:;]+$/.test(t)) return false
  if (looksLikePhone(t)) return false
  if (hasDigits(t)) return false
  if (SKIP.test(t)) return false
  if (/^\d+[\s/]*(gr|kg|pcs|g|roll|meter|cm|mm|KG)/i.test(t)) return false
  return true
}

function extractNamesFromPenerima(lines: string[]): string[] {
  const names: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!/^Penerima\s*:?\s*$|^Penerima\s*:?\s*(.+)/i.test(line)) continue

    const m = line.match(/^Penerima\s*:?\s*(.+)/i)
    if (m?.[1]) {
      const val = m[1].trim()
      if (isName(val) && !/toko/i.test(val)) { names.push(val); continue }
    }

    for (let j = 1; j < 30; j++) {
      if (i + j < lines.length) {
        const c = lines[i + j].trim()
        if (!c || looksLikePhone(c)) continue
        if (isName(c)) { names.push(c); break }
      }
    }
  }

  return names
}

export function parseLabelText(text: string): PdfLabel[] {
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (rawLines.length < 3) return []

  const lines = rawLines.map(fixSpacedWords)
  const joined = lines.join('\n')

  const courier = detectCourier(joined)
  if (!courier) return []

  const directNames = extractNamesFromPenerima(lines)

  let marketplace = detectMarketplace(joined)
  if (!marketplace && courier.short === 'SPX') marketplace = 'SP'
  if (!marketplace) marketplace = 'TP'

  if (directNames.length > 0) {
    return directNames.map(name => ({
      courier: courier.name,
      courierShort: courier.short,
      recipientName: name,
      marketplace,
    }))
  }

  for (const line of lines) {
    const nm = line.match(/\bNickName\s*:?\s*(.+)/i)
    if (nm) {
      const n = nm[1].trim().split(/[\n\r]/)[0].trim()
      if (n && n.length >= 2 && n.length <= 60) {
        return [{
          courier: courier.name,
          courierShort: courier.short,
          recipientName: n,
          marketplace,
        }]
      }
    }
  }

  return []
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
