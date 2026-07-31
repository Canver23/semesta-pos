import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diupload' }, { status: 400 })
    }

    if (!file.name.match(/\.xlsx?$/i)) {
      return NextResponse.json({ error: 'File harus berformat XLSX' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })

    const sheets = wb.SheetNames.map(name => {
      const ws = wb.Sheets[name]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
      return {
        name,
        rows: data.length,
        cols: data[0]?.length ?? 0,
        headers: data[0] ?? [],
        data: data.slice(1).filter(row => {
          if (!row || row.length === 0) return false
          const hasContent = row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '')
          return hasContent
        }),
      }
    })

    return NextResponse.json({
      success: true,
      fileName: file.name,
      sheets,
    })
  } catch (err) {
    console.error('Spreadsheet parse error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
