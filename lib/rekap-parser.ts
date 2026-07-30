export interface RecipientEntry {
  name: string
  marketplace: 'TP' | 'SP'
}

export interface CourierGroup {
  courier: string
  short: string
  recipients: RecipientEntry[]
}

export interface PdfLabel {
  courier: string
  courierShort: string
  recipientName: string
  marketplace: 'TP' | 'SP' | null
}

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

function normalizeSpacedText(lines: string[]): string[] {
  return lines.map(line => {
    return line.replace(
      /\b([A-Za-z*])(\s+[A-Za-z*]){2,}\b/g,
      m => m.replace(/\s+/g, '')
    )
  })
}

function detectCourier(text: string): { name: string; short: string } | null {
  if (/\bJY\d{8,}\b/.test(text)) return { name: 'J&T', short: 'J&T' }
  if (/\bTSA-?\d{8,}\b/.test(text)) return { name: 'SiCepat', short: 'SiCepat' }
  if (/No\.?\s*Resi\s*:?\s*\d{12,}/.test(text)) return { name: 'AnterAja', short: 'AA' }
  if (/\bCASHLESS\b/i.test(text)) return { name: 'AnterAja', short: 'AA' }
  if (/\bFastTrack\b/i.test(text)) return { name: 'SPX', short: 'SPX' }
  if (/spexpress|spx/i.test(text)) return { name: 'SPX', short: 'SPX' }
  if (/jet\.co\.id|\bjnt\b|j&t/i.test(text)) return { name: 'J&T', short: 'J&T' }
  if (/sicepat|si cepat/i.test(text)) return { name: 'SiCepat', short: 'SiCepat' }
  if (/\bjne\b|jalur nugraha/i.test(text)) return { name: 'JNE', short: 'JNE' }
  if (/pos indonesia|pt pos/i.test(text)) return { name: 'Pos Indonesia', short: 'Pos' }
  if (/id express|idexpress/i.test(text)) return { name: 'ID Express', short: 'IDX' }
  if (/ninja van|ninjavan/i.test(text)) return { name: 'Ninja', short: 'Ninja' }
  return null
}

function detectMarketplace(text: string): 'TP' | 'SP' | null {
  if (/TT\s*Order\s*ID/i.test(text)) return 'TP'
  if (text.toLowerCase().includes('tiktokshop') || text.toLowerCase().includes('tiktok shop')) return 'TP'
  if (/No\.\s*Pesanan\s*:/i.test(text)) return 'SP'
  if (text.toLowerCase().includes('shopee')) return 'SP'
  if (text.toLowerCase().includes('tokopedia')) return 'TP'
  if (/Ship\s*:|Order\s*Id\s*:|jet\.co\.id/i.test(text)) return 'TP'
  return null
}

function looksLikeName(s: string): boolean {
  const t = s.trim()
  if (!t || t.length < 2 || t.length > 60) return false
  if (/^[\d\s.-]+$/.test(t)) return false
  if (/^\+?62\d{6,}$/.test(t)) return false
  if (/^\d{6,}$/.test(t)) return false
  if (/^(Toko|Plastik|Semesta|Pengirim|Penerima|Jawa|Jalan|Jl|DKI|BANTEN|COD|CASHLESS|Weight|Ship|Order|Product|Print|No|Syarat|SKU|Qty|Nama|Berat|KOTA|KAB|RT|Dusun|Barang|Default|Batas|Nick|Pasar|Kompleks|Penjual|Ruko|FOOD|Plastik|Kuning|Hitam|CHEFFY|Polynet|Tali|In|Estimated|CASHLESS|BATAS|GRADE|STRETCH|FILM|WRAP|WRAPPING|PEMBUNGKUS|MAKANAN|MET|ROLL|CM|Pcs|Bal|Pack|Lembar|Toros)\b/i.test(t)) return false
  if (/^\d.*(gr|kg|pcs|g|KG|GR|Pcs|Gram|gram)$/i.test(t)) return false
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
      if (looksLikeName(val) && !/toko/i.test(val)) { names.push(val); continue }
    }

    for (let j = i + 1; j < Math.min(lines.length, i + 15); j++) {
      const c = lines[j].trim()
      if (!c || /^\+?62\d{6,}/.test(c) || /^\d{6,}$/.test(c)) continue
      if (looksLikeName(c)) { names.push(c); break }
    }
  }

  for (const line of lines) {
    const nm = line.match(/\bNickName\s*:?\s*(.+)/i)
    if (nm) {
      const n = nm[1].trim().split(/[\n\r]/)[0].trim()
      if (n && n.length >= 2 && n.length <= 60) names.push(n)
    }
  }

  return names
}

export function parseLabelText(text: string): PdfLabel | null {
  let lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 3) return null

  lines = normalizeSpacedText(lines)
  const joined = lines.join('\n')

  const courier = detectCourier(joined)
  if (!courier) return null

  const names = extractNames(lines)
  if (names.length === 0) return null

  let marketplace = detectMarketplace(joined)
  if (!marketplace && courier.short === 'SPX') marketplace = 'SP'
  if (!marketplace) marketplace = 'TP'

  return {
    courier: courier.name,
    courierShort: courier.short,
    recipientName: names[0],
    marketplace,
  }
}

export function parseRecap(labels: PdfLabel[]): {
  groups: CourierGroup[]
  summary: { TP: number; SP: number; total: number }
} {
  const map = new Map<string, RecipientEntry[]>()

  for (const label of labels) {
    const key = label.courierShort
    if (!map.has(key)) map.set(key, [])
    const mp = label.marketplace || 'TP'
    map.get(key)!.push({ name: label.recipientName, marketplace: mp })
  }

  const order = ['AA', 'J&T', 'SPX', 'SiCepat', 'JNE', 'Pos', 'IDX', 'Ninja']
  const groups: CourierGroup[] = []

  for (const short of order) {
    const recipients = map.get(short)
    if (recipients && recipients.length > 0) {
      const courier = COURIERS.find(c => c.short === short)
      groups.push({ courier: courier?.name ?? short, short, recipients })
      map.delete(short)
    }
  }

  for (const [short, recipients] of map) {
    groups.push({ courier: short, short, recipients })
  }

  let TP = 0
  let SP = 0
  for (const g of groups) {
    for (const r of g.recipients) {
      if (r.marketplace === 'TP') TP++
      else SP++
    }
  }

  return { groups, summary: { TP, SP, total: TP + SP } }
}
