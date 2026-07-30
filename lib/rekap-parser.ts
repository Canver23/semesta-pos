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

const COURIERS: { name: string; short: string; patterns: string[] }[] = [
  { name: 'AnterAja', short: 'AA', patterns: ['anteraja', 'anter aja', 'anteraja.id'] },
  { name: 'J&T', short: 'J&T', patterns: ['j&t', 'jnt', 'j&t express', 'jnt express', 'jet'] },
  { name: 'SPX', short: 'SPX', patterns: ['spx', 'shopee express', 'shopee xpress', 'spexpress'] },
  { name: 'SiCepat', short: 'SiCepat', patterns: ['sicepat', 'si cepat'] },
  { name: 'JNE', short: 'JNE', patterns: ['\bjne\b', 'jalur nugraha'] },
  { name: 'Pos Indonesia', short: 'Pos', patterns: ['pos indonesia', 'pt pos'] },
  { name: 'ID Express', short: 'IDX', patterns: ['id express', 'idexpress'] },
  { name: 'Ninja', short: 'Ninja', patterns: ['ninja van', 'ninjavan'] },
]

function detectCourier(text: string): { name: string; short: string } | null {
  const lower = text.toLowerCase()
  for (const c of COURIERS) {
    for (const p of c.patterns) {
      if (lower.includes(p)) return { name: c.name, short: c.short }
    }
  }
  return null
}

function detectMarketplace(text: string): 'TP' | 'SP' | null {
  const lower = text.toLowerCase()
  if (lower.includes('shopee')) return 'SP'
  if (lower.includes('tokopedia') || lower.includes('tiktok') || lower.includes('tiktokshop')) return 'TP'
  return null
}

const RECIPIENT_PATTERNS = [
  /\bPenerima\s*:?\s*(.+)/i,
  /(?:nama\s*penerima|kepada|ditujukan\s*kepada|recipient|buyer|tujuan)\s*[:\s]+(.+)/i,
  /(?:Nama|To)\s*[:\s]+(.+)/,
]

function extractRecipientName(text: string): string | null {
  for (const pattern of RECIPIENT_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      let name = match[1].trim()
      name = name.split(/[\n\r,]/)[0].trim()
      name = name.replace(/\s{2,}/g, ' ')
      name = name.replace(/[^\w\s.'*]/g, '').trim()
      if (name.length >= 2 && name.length <= 60) {
        return name
      }
    }
  }
  return null
}

export function parseLabelText(text: string): PdfLabel | null {
  const courier = detectCourier(text)
  if (!courier) return null

  const recipientName = extractRecipientName(text)
  if (!recipientName) return null

  let marketplace = detectMarketplace(text)

  if (!marketplace) {
    if (courier.short === 'SPX') marketplace = 'SP'
  }

  return {
    courier: courier.name,
    courierShort: courier.short,
    recipientName,
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
      groups.push({
        courier: courier?.name ?? short,
        short,
        recipients,
      })
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
