import { NextRequest, NextResponse } from 'next/server'
import { parseLabelText, parseRecap, type PdfLabel } from '@/lib/rekap-parser'
import { createRequire } from 'module'
import { pathToFileURL } from 'url'

const req = createRequire(import.meta.url)
const WORKER_PATH = pathToFileURL(
  req.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs')
).href

function detectGlobalMarketplace(fullText: string): 'TP' | 'SP' | null {
  const lower = fullText.toLowerCase()
  const hasShopee = lower.includes('shopee')
  const hasTP = lower.includes('tokopedia') || lower.includes('tiktokshop') || lower.includes('tiktok shop')

  if (hasShopee && !hasTP) return 'SP'
  if (!hasShopee && hasTP) return 'TP'
  return null
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const mod = await import('pdfjs-dist/legacy/build/pdf.mjs')
  mod.GlobalWorkerOptions.workerSrc = WORKER_PATH

  const data = new Uint8Array(buffer)
  const doc = await mod.getDocument({ data }).promise

  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const textContent = await page.getTextContent()
    const text = textContent.items
      .map((item: any) => item.str)
      .join(' ')
    pages.push(text)
  }

  return pages.join('\n')
}

function processText(fullText: string): PdfLabel[] {
  const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean)

  const penerimaIndices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (/penerima\s*:?\b/i.test(lines[i])) {
      penerimaIndices.push(i)
    }
  }

  if (penerimaIndices.length === 0) {
    penerimaIndices.push(0)
  }

  const windowSize = 30
  const chunks: string[] = []
  for (const idx of penerimaIndices) {
    const start = Math.max(0, idx - windowSize)
    const end = Math.min(lines.length, idx + windowSize)
    chunks.push(lines.slice(start, end).join('\n'))
  }

  const labels: PdfLabel[] = []
  for (const chunk of chunks) {
    const result = parseLabelText(chunk)
    if (result) {
      const isDuplicate = labels.some(
        l => l.recipientName.toLowerCase() === result.recipientName.toLowerCase()
          && l.courierShort === result.courierShort
      )
      if (!isDuplicate) {
        labels.push(result)
      }
    }
  }

  if (labels.length === 0) {
    const chunkSize = 50
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize).join('\n')
      const result = parseLabelText(chunk)
      if (result) {
        const isDuplicate = labels.some(
          l => l.recipientName.toLowerCase() === result.recipientName.toLowerCase()
            && l.courierShort === result.courierShort
        )
        if (!isDuplicate) {
          labels.push(result)
        }
      }
    }
  }

  return labels
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

    for (const file of pdfFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        let fullText = ''
        try {
          fullText = await extractPdfText(buffer)
        } catch (err: any) {
          errors.push(`${file.name}: gagal membaca PDF (${err.message ?? 'error'})`)
          continue
        }

        if (!fullText || fullText.trim().length < 10) {
          errors.push(`${file.name}: tidak ada teks (mungkin scan/gambar)`)
          continue
        }

        const marketplace = detectGlobalMarketplace(fullText)
        const labels = processText(fullText)

        if (labels.length === 0) {
          errors.push(`${file.name}: tidak ditemukan data penerima`)
          continue
        }

        for (const label of labels) {
          if (!label.marketplace && marketplace) {
            label.marketplace = marketplace
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
