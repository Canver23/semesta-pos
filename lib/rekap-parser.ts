export interface RecipientEntry { name: string; marketplace: 'TP' | 'SP' }
export interface CourierGroup { courier: string; short: string; recipients: RecipientEntry[] }
export interface PdfLabel { courier: string; courierShort: string; recipientName: string; marketplace: 'TP' | 'SP' | null }

const COURIERS: { name: string; short: string; patterns: RegExp[] }[] = [
  { name: 'AnterAja', short: 'AA', patterns: [/anteraja/i] },
  { name: 'J&T', short: 'J&T', patterns: [/j&t/i] },
  { name: 'SPX', short: 'SPX', patterns: [/spx/i] },
  { name: 'SiCepat', short: 'SiCepat', patterns: [/sicepat/i] },
  { name: 'PAXEL', short: 'PAXEL', patterns: [/paxel/i] },
  { name: 'JNE', short: 'JNE', patterns: [/jne/i] },
  { name: 'Pos Indonesia', short: 'Pos', patterns: [/pos indonesia/i] },
  { name: 'ID Express', short: 'IDX', patterns: [/id express/i] },
  { name: 'Ninja', short: 'Ninja', patterns: [/ninjavan/i] },
]

function normalizeLine(line: string): string {
  const tokens = line.split(/\s+/)
  if (tokens.length < 3) return line

  const totalLen = tokens.reduce((s: number, t: string) => s + t.length, 0)
  const avg = totalLen / tokens.length

  if (avg < 3.5) return tokens.join('')
  return line
}

function detectCourier(text: string): { name: string; short: string } | null {
  const fl = text.split('\n')[0].trim()

  if (/(?:p\s*a\s*x\s*e\s*l|paxel)|TO\s*\(\s*ADDRESS\s*\)/i.test(text)) return { name: 'PAXEL', short: 'PAXEL' }
  if (/^(?:NDD|EZ)$/i.test(fl)) return { name: 'J&T', short: 'J&T' }
  if (/^(?:ECO)$/i.test(fl)) {
    if (/\bNo\s*\.?\s*Pesanan\s*:/i.test(text) || /shopee/i.test(text)) return { name: 'SPX', short: 'SPX' }
    return { name: 'J&T', short: 'J&T' }
  }
  if (/^(?:STD)$/i.test(fl)) return { name: 'SPX', short: 'SPX' }
  if (/^(?:REG)$/i.test(fl)) return { name: 'AnterAja', short: 'AA' }
  if (/^(?:SD)$/i.test(fl)) return { name: 'AnterAja', short: 'AA' }
  if (/^(?:HOME)$/i.test(fl)) return { name: 'SPX', short: 'SPX' }
  if (/^(?:FastTrack)$/i.test(fl)) return { name: 'J&T', short: 'J&T' }
  if (/\bSAMEDAY\b/i.test(text) && /\bTO\s*\(\s*ADDRESS\s*\)/i.test(text)) return { name: 'PAXEL', short: 'PAXEL' }
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
  if (/shopee/i.test(text)) return 'SP'
  if (/\bNo\s*\.?\s*Pesanan\s*:/i.test(text)) return 'SP'
  return 'TP'
}

function hasDigits(s: string, min: number = 5): boolean {
  return s.replace(/\D/g, '').length >= min
}

const SKIP_WORD = /^(toko|plastik|semesta|tokoplastik|tokoplastiksemesta|pengirim|penerima|jawa|jalan|jl|dki|banten|cod|cashless|weight|ship|order|product|print|no|syarat|sku|qty|nama|berat|kota|kab|rt|dusun|barang|default|batas|nick|pasar|kompleks|penjual|ruko|ndd|eco|reg|std|ez|home|sd|sameday|fasttrack|jnt|anteraja|sicepat|spx|jne|ninja|pos|paxel|from|sender|tali|polynet|cheffy|plastik|wrapping|kuning|hitam|putih|merah|biru|hijau|abu|pcs|bal|pack|lembar|toros|kg|gram|food|grade|meter|roll|cm|mm|metre|strerch|film|pembungkus|makanan|waring|rambang|jaring|buah|panjang|rafia|galaksi|ikat|kuat|tebal|serbaguna|teluk|warung|naga|shasa|salad|garuda|perempatan|gniblorajateng|gni|blora|jateng|sebelah|bank|mega|disara|coblong|imam|bonjol|sera|induk|caringin|ciparay|babakan|pamokolan|cihaurbeuti|ciamis|bandung|jakarta|mampang|prapatan|balaraja|kartawijaya|nomor|plastik|wrapping|stretch|grade|food)$/i

const ADDRESS_SUBSTR = ['gni', 'blora', 'jateng', 'perempatan', 'coblong', 'caringin', 'ciamis', 'bandung', 'jakarta', 'mampang', 'balaraja', 'bonjol', 'ciparay', 'pamokolan', 'cihaurbeuti', 'kartawijaya', 'prapatan', 'babakan', 'imam', 'induk', 'sera', 'mega', 'sebelah', 'disara', 'nomor']

function isName(s: string): boolean {
  const t = s.trim()
  if (!t || t.length < 2 || t.length > 60) return false
  if (/[:;=,：]/.test(t)) return false
  if (hasDigits(t, 3)) return false
  if (/^[\d\s.,()+\-/:;|：]+$/.test(t)) return false
  if (/^[A-Z\s]{4,20}$/.test(t) && (t.match(/[A-Z]/g) || []).length >= 4) return false

  const lower = t.toLowerCase()
  const alphaCount = (lower.match(/[a-z*]/gi) || []).length
  if (alphaCount < 1) return false

  for (const kw of ADDRESS_SUBSTR) {
    if (lower.includes(kw)) return false
  }

  const tokens = lower.split(/[\s：:=()]+/)
  if (tokens.length >= 5) return false

  for (const tk of tokens) {
    if (SKIP_WORD.test(tk)) return false
  }

  return true
}

function extractNames(lines: string[], backwardFirst: boolean, useToAddress: boolean): string[] {
  const names: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    let isRecipientLine = /^Penerima\s*:?\s*$|^Penerima\s*:?\s*(.+)/i.test(line)
    if (useToAddress) {
      isRecipientLine = /\bTO\s*\(\s*ADDRESS\s*\)/i.test(line) && !/\bFROM\b/i.test(line)
    }

    if (!isRecipientLine) continue

    const m = line.match(/^Penerima\s*:?\s*(.+)/i)
    if (!useToAddress && m?.[1]) {
      const val = m[1].trim()
      if (isName(val)) { names.push(val); continue }
    }

    let found = false

    if (backwardFirst) {
      for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
        const c = lines[j].trim()
        if (!c) continue
        if (isName(c)) { names.push(c); found = true; break }
      }
      if (found) continue
    }

    for (let j = 1; j < 20; j++) {
      if (i + j >= lines.length) break
      const c = lines[i + j].trim()
      if (!c) continue
      if (useToAddress && /\bFROM\b/i.test(c)) continue
      if (isName(c)) { names.push(c); found = true; break }
    }

    if (!found) {
      for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
        const c = lines[j].trim()
        if (!c) continue
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
  const isPaxel = /p\s*a\s*x\s*e\s*l|paxel|TO\s*\(\s*ADDRESS\s*\)/i.test(joined)

  const useToAddress = isPaxel
  const directNames = extractNames(lines, isCargo, useToAddress)
  if (directNames.length === 0) return []

  let marketplace = detectMarketplace(joined)

  const prefix = isCargo ? 'Cargo - ' : isPaxel ? 'sameday - ' : ''

  return directNames.map(name => ({
    courier: courier.name,
    courierShort: courier.short,
    recipientName: prefix ? `${prefix}${name}` : name,
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

  const order = ['AA', 'J&T', 'SPX', 'SiCepat', 'PAXEL', 'JNE', 'Pos', 'IDX', 'Ninja']
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
