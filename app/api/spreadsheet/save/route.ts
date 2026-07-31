import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileName, sheets } = body

    if (!sheets || !Array.isArray(sheets)) {
      return NextResponse.json({ error: 'Data sheet tidak valid' }, { status: 400 })
    }

    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    for (const sheet of sheets) {
      const fullData = ([sheet.headers, ...sheet.data])
      const ws = XLSX.utils.aoa_to_sheet(fullData as any[][])
      XLSX.utils.book_append_sheet(wb, ws, sheet.name)
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

    const safeName = fileName || 'spreadsheet.xlsx'

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(safeName)}"`,
      },
    })
  } catch (err) {
    console.error('Spreadsheet save error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
