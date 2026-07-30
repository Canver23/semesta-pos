import { NextRequest, NextResponse } from 'next/server'
import { parseLabelText, parseRecap, type PdfLabel } from '@/lib/rekap-parser'

function detectGlobalMarketplace(fullText: string): 'TP' | 'SP' | null {
  const lower = fullText.toLowerCase()
  const hasShopee = lower.includes('shopee')
  const hasTP = lower.includes('tokopedia') || lower.includes('tiktokshop') || lower.includes('tiktok shop')
    || /tt\s*o\s*r\s*d\s*e\s*r\s*i\s*d/i.test(fullText)

  if (hasShopee && !hasTP) return 'SP'
  if (!hasShopee && hasTP) return 'TP'
  return null
}

async function extractPdfText(buffer: Buffer): Promise<string[]> {
  const mod = await import('pdfjs-dist/legacy/build/pdf.mjs')
  mod.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    'file://' + process.cwd() + '/node_modules/'
  ).href

  const data = new Uint8Array(buffer)
  const doc = await mod.getDocument({ data }).promise

  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const textContent = await page.getTextContent()

    const lines: string[] = []
    let currentLine = ''
    let lastY = -1

    for (const item of textContent.items) {
      const textItem = item as any
      const y = textItem.transform?.[5] ?? 0
      if (lastY !== -1 && Math.abs(y - lastY) > 3) {
        if (currentLine) lines.push(currentLine.trim())
        currentLine = ''
      }
      currentLine += textItem.str
      lastY = y
    }
    if (currentLine) lines.push(currentLine.trim())

    const text = lines.join('\n').trim()
    if (text) pages.push(text)
  }

  return pages
}

function isDuplicateLabel(a: PdfLabel, b: PdfLabel): boolean {
  return a.recipientName.toLowerCase() === b.recipientName.toLowerCase()
    && a.courierShort === b.courierShort
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'Tidak ada file yang diupload' }, { status: 400 })
    }

    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (pdfFiles.length === 0) {
      return NextResponse.json({ error: 'Semua file harus berformat PDF' }, { status: 400 })
    }

    const allLabels: PdfLabel[] = []
    const errors: string[] = []
    const rawTexts: string[] = []

    for (const file of pdfFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        let pages: string[]
        try {
          pages = await extractPdfText(buffer)
        } catch (err: any) {
          errors.push(`${file.name}: gagal membaca PDF (${err.message ?? 'error'})`)
          continue
        }

        if (!pages.length) {
          errors.push(`${file.name}: tidak ada teks (mungkin scan/gambar)`)
          continue
        }

        const fullText = pages.join('\n\n')

        const globalMarketplace = detectGlobalMarketplace(fullText)
        let fileLabels: PdfLabel[] = []

        for (const pageText of pages) {
          if (pageText.trim().length < 30) continue
          const labels = parseLabelText(pageText)
          fileLabels.push(...labels)
        }

        if (fileLabels.length === 0) {
          const labels = parseLabelText(fullText)
          fileLabels = labels
        }

        if (fileLabels.length === 0) {
          const samples = pages.slice(0, 3).map((p, i) =>
            `[Hal ${i + 1}] ${p.replace(/\s+/g, ' ').substring(0, 300)}`
          )
          rawTexts.push(`=== ${file.name} (${pages.length} hal) ===\n${samples.join('\n\n')}`)
          errors.push(`${file.name}: tidak ditemukan data penerima (${pages.length} halaman)`)
          continue
        }

        for (const label of fileLabels) {
          if (!label.marketplace && globalMarketplace) {
            label.marketplace = globalMarketplace
          }
          if (!label.marketplace) label.marketplace = 'TP'

          if (!allLabels.some(l => isDuplicateLabel(l, label))) {
            allLabels.push(label)
          }
        }
      } catch (err: any) {
        console.error(`Error processing ${file.name}:`, err)
        errors.push(`${file.name}: error server`)
      }
    }

    if (allLabels.length === 0) {
      return NextResponse.json({
        error: 'Tidak dapat menemukan data penerima di semua file.',
        fileErrors: errors,
        rawText: rawTexts.join('\n\n'),
      }, { status: 422 })
    }

    const recap = parseRecap(allLabels)

    return NextResponse.json({
      success: true,
      totalFiles: pdfFiles.length,
      totalLabels: allLabels.length,
      labels: allLabels,
      ...recap,
      fileErrors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('Rekap parse error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
