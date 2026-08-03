'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import { Camera, RotateCcw, Loader2, Check, Copy, X, Edit3, Save, Image, AlertCircle } from 'lucide-react'

interface OcrResult { ekspedisi: string; resi: string; berat: string; nama: string; raw: string }

interface CapturedItem {
  id: string; imageDataUrl: string; ocr: OcrResult | null; timestamp: number; uploaded: boolean; uploadUrl: string; uploadError?: string
}

export default function FotoPaketPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [captured, setCaptured] = useState<CapturedItem[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEkspedisi, setEditEkspedisi] = useState('')
  const [editResi, setEditResi] = useState('')
  const [editBerat, setEditBerat] = useState('')
  const [editNama, setEditNama] = useState('')
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'foto' | 'galeri'>('foto')

  const startCamera = useCallback(async () => {
    setCameraError('')
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCameraReady(true)
    } catch (err: any) { setCameraError(err.message || 'Tidak bisa mengakses kamera') }
  }, [facing])

  useEffect(() => { startCamera(); return () => { streamRef.current?.getTracks().forEach(t => t.stop()) } }, [startCamera])

  function toggleFacing() { setFacing(f => f === 'environment' ? 'user' : 'environment'); setCameraReady(false); setTimeout(startCamera, 200) }

  async function capture() {
    const video = videoRef.current; const canvas = canvasRef.current
    if (!video || !canvas || !cameraReady) return
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7)
    const id = String(Date.now())
    const item: CapturedItem = { id, imageDataUrl, ocr: null, timestamp: Date.now(), uploaded: false, uploadUrl: '', uploadError: '' }
    setCaptured(prev => [item, ...prev])
    saveToLocal(item)
    setProcessingId(id); setProgress(0)
    try {
      const Tesseract = (await import('tesseract.js')).default
      const worker = await Tesseract.createWorker('eng+ind', 1, { logger: (m: any) => { if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100)) } })
      const { data } = await worker.recognize(imageDataUrl); await worker.terminate()
      const ocr = parseOcr(data.text)
      setCaptured(prev => { const updated = prev.map(c => c.id === id ? { ...c, ocr } : c); saveToLocal(updated[0]!); return updated })
    } catch (_) {} finally { setProcessingId(null) }
  }

  function parseOcr(text: string): OcrResult {
    let ekspedisi = '', resi = '', berat = '', nama = ''

    // Clean: remove spaces between single chars (S P X → SPX)
    const clean = text.replace(/\b(\w)(\s+)(\w)\b/g, (_, a, _s, b) => a + b)

    // EKSPEDISI — prioritas: kurir diketahui dari logo/teks
    if (/(?:jet\.co\.id|jnt|j&t)/i.test(clean)) ekspedisi = 'J&T'
    else if (/\bSPX[A-Za-z]*\s*ID|shopee\s*express/i.test(clean)) ekspedisi = 'SPX'
    else if (/anteraja|anter\s*aja|CASHLESS/i.test(clean)) ekspedisi = 'AnterAja'
    else if (/\bCM\d{10,}/.test(clean)) ekspedisi = 'JNE'
    else if (/\bTSA-?\d{8,}/.test(clean)) ekspedisi = 'SiCepat'
    else if (/paxel|TO\s*\(\s*ADDRESS/i.test(clean)) ekspedisi = 'PAXEL'
    else if (/\bJY\d{6,}/.test(clean)) ekspedisi = 'J&T'

    // RESI — priority: known courier prefixes, then Order/OrderID, then any long digit
    const resiCandidates = clean.match(/(?:SPX[A-Za-z]*\s*ID\d{6,}|JY\d{6,}|S\d{16,}|CM\d{8,}|TSA-?\d{8,}|\d{12,})/i)
    if (resiCandidates) {
      resi = resiCandidates[0].replace(/\s+/g, '')
    }
    if (!resi) {
      const orderM = clean.match(/Order\s*1d?\s*:\s*([\w-]{8,})/i)
      if (orderM) resi = orderM[1].replace(/\s+/g, '')
    }
    if (!resi) {
      const noResi = clean.match(/No\.?\s*Resi\s*:?\s*([\w-]{8,})/i)
      if (noResi) resi = noResi[1].replace(/\s+/g, '')
    }

    // BERAT — cek display timbangan (angka desimal kg/gr) atau label "Berat"
    let beratMatch = clean.match(/(\d{1,3}\s*[.,]\s*\d{1,3})\s*(?:kg|Kg|KG)\b/i)
    if (beratMatch) {
      const w = parseFloat(beratMatch[1].replace(',', '.'))
      if (w > 0 && w < 100) berat = w.toFixed(2) + ' kg'
    }
    if (!berat) {
      const beratLabel = clean.match(/Berat\s*:?\s*(\d[\d.,]*)\s*(?:gr|gram)\b/i)
      if (beratLabel && parseFloat(beratLabel[1].replace(',', '')) > 0) {
        berat = beratLabel[1].replace(',', '') + ' gr'
      }
    }
    if (!berat) {
      const w3 = clean.match(/(\d{1,5})\s*(?:gr|gram|Gr|GR)\b/i)
      if (parseFloat(w3?.[1] || '0') > 0) berat = w3![1] + ' gr'
    }

    // NAMA — toleran terhadap kesalahan OCR ("Penerima" → "Pencrima"/"Peneima"/dll)
    let raw = ''
    // P[eo]n?[ce]r[ie]m?[a1] — huruf fleksibel untuk kata "Penerima"
    const p = /\bP[a-z]*e[a-z]*n[a-z]*[ce][a-z]*r[a-z]*i[a-z]*m[ae]\s*:?\s*(.+)/i
    const namaM = clean.match(p)
    if (namaM) raw = namaM[1]
    if (!raw) {
      const namaM2 = clean.match(/Nama\s*Penerima\s*:?\s*(.+)/i)
      if (namaM2) raw = namaM2[1]
    }
    if (!raw) {
      const namaM3 = clean.match(/Kepada\s*:?\s*(.+)/i)
      if (namaM3) raw = namaM3[1]
    }
    if (raw) {
      let cleaned = raw.trim().split(/[\n\r]+/)[0].trim()
      // Kalau nama gabung dgn nomor telp, ambil bagian nama saja
      cleaned = cleaned.replace(/\s*\(\+?\d[\d\s]*\)?\s*$/, '').trim()
      cleaned = cleaned.replace(/^\d[\d\s]*\s+/, '').trim()
      if (cleaned.length >= 2 && !/^\d{6,}$/.test(cleaned)) nama = cleaned
    }

    return { ekspedisi, resi, berat, nama, raw: text.substring(0, 500) }
  }

  function saveToLocal(item: CapturedItem) {
    try {
      const stored = JSON.parse(localStorage.getItem('semesta-foto-paket') || '[]')
      const idx = stored.findIndex((s: any) => s.id === item.id)
      if (idx >= 0) stored[idx] = item; else stored.unshift(item)
      localStorage.setItem('semesta-foto-paket', JSON.stringify(stored.slice(0, 50)))
    } catch (_) {}
  }

  function loadFromLocal(): CapturedItem[] {
    try { return JSON.parse(localStorage.getItem('semesta-foto-paket') || '[]') } catch (_) { return [] }
  }

  async function uploadToServer(item: CapturedItem) {
    setUploadingId(item.id)
    try {
      const res = await fetch('/api/foto-paket/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageDataUrl: item.imageDataUrl }) })
      const data = await res.json()
      if (data.url) {
        setCaptured(prev => {
          const updated = prev.map(c => c.id === item.id ? { ...c, uploaded: true, uploadUrl: data.url, uploadError: '' } : c)
          const found = updated.find(c => c.id === item.id)
          if (found) saveToLocal(found)
          return updated
        })
      } else {
        setCaptured(prev => prev.map(c => c.id === item.id ? { ...c, uploadError: data.error || 'Gagal' } : c))
      }
    } catch (err: any) {
      setCaptured(prev => prev.map(c => c.id === item.id ? { ...c, uploadError: err.message || 'Gagal' } : c))
    } finally { setUploadingId(null) }
  }

  function startEdit(item: CapturedItem) {
    const o = item.ocr || { ekspedisi: '', resi: '', berat: '', nama: '', raw: '' }
    setEditingId(item.id); setEditEkspedisi(o.ekspedisi); setEditResi(o.resi); setEditBerat(o.berat); setEditNama(o.nama)
  }
  function saveEdit(id: string) {
    setCaptured(prev => {
      const updated = prev.map(c => { if (c.id !== id) return c; const ocr = c.ocr || { ekspedisi: '', resi: '', berat: '', nama: '', raw: '' }; return { ...c, ocr: { ...ocr, ekspedisi: editEkspedisi, resi: editResi, berat: editBerat, nama: editNama } } })
      const found = updated.find(c => c.id === id)
      if (found) saveToLocal(found)
      return updated
    })
    setEditingId(null)
  }
  function toggleCollapse(id: string) { setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  async function handleCopy(text: string, id: string) { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500) }
  function formatOneLine(o: OcrResult): string { const p: string[] = []; if (o.ekspedisi) p.push(o.ekspedisi); if (o.resi) p.push(o.resi); if (o.nama) p.push(o.nama); if (o.berat) p.push(o.berat); return p.join(' | ') }
  async function copyAll() {
    const lines = captured.map(c => c.ocr ? formatOneLine(c.ocr) : '').filter(Boolean).join('\n')
    await navigator.clipboard.writeText(lines)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-0">
        <div className="pt-14 md:pt-0 pb-16 md:pb-0 px-4 md:px-6 py-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setActiveTab('foto')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'foto' ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Camera size={14} /> Foto</button>
            <button onClick={() => setActiveTab('galeri')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'galeri' ? 'bg-brand-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Image size={14} /> Galeri</button>
          </div>

          {activeTab === 'galeri' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Foto Tersimpan</h2>
              <button onClick={() => setCaptured(loadFromLocal())} className="btn-ghost btn-sm mb-2">Muat dari localStorage</button>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {captured.map(item => (
                  <div key={item.id} className="card p-3">
                    <img src={item.imageDataUrl} className="w-full aspect-[4/3] object-cover rounded-lg border mb-2" alt="paket" />
                    <div className="text-xs space-y-0.5">
                      {item.ocr?.resi && <p><span className="text-gray-400">Resi:</span> <span className="font-mono">{item.ocr.resi}</span></p>}
                      {item.ocr?.berat && <p><span className="text-gray-400">Berat:</span> {item.ocr.berat}</p>}
                      {item.ocr?.nama && <p><span className="text-gray-400">Nama:</span> {item.ocr.nama}</p>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {item.uploaded ? (
                        <span className="text-green-500 text-xs">Tersimpan di server</span>
                      ) : (
                        <button onClick={() => uploadToServer(item)} disabled={uploadingId === item.id} className="btn-blue btn-sm text-xs">
                          {uploadingId === item.id ? <Loader2 size={12} className="animate-spin" /> : 'Simpan'}
                        </button>
                      )}
                      {item.uploadError && <span className="text-red-400 text-xs flex items-center gap-1"><AlertCircle size={10} /> {item.uploadError}</span>}
                    </div>
                  </div>
                ))}
                {captured.length === 0 && <p className="text-sm text-gray-400 col-span-3 text-center py-8">Belum ada foto. Klik "Muat dari localStorage".</p>}
              </div>
            </div>
          )}

          {activeTab === 'foto' && (
            <>
              <div className="card mb-6 overflow-hidden p-0">
                {cameraError ? (
                  <div className="p-8 text-center"><p className="text-sm text-red-500 mb-2">{cameraError}</p><button onClick={startCamera} className="btn-ghost btn-sm">Coba Lagi</button></div>
                ) : (
                  <div className="relative bg-black aspect-[4/3]">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                    <canvas ref={canvasRef} className="hidden" />
                    {cameraReady && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                        <button onClick={capture} className="w-16 h-16 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition active:scale-95">
                          <div className="w-14 h-14 rounded-full border-4 border-brand-400" />
                        </button>
                      </div>
                    )}
                    <button onClick={toggleFacing} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/80 shadow flex items-center justify-center hover:bg-white transition"><RotateCcw size={16} /></button>
                    {!cameraReady && !cameraError && <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-white" /></div>}
                  </div>
                )}
              </div>

              {captured.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-500">{captured.length} foto diambil</p>
                    <button onClick={copyAll} className="btn-ghost btn-sm"><Copy size={14} /> Copy Semua</button>
                  </div>
                  <div className="space-y-4">
                    {captured.map((item) => {
                      const isProcessing = processingId === item.id; const isCollapsed = collapsed.has(item.id); const isEditing = editingId === item.id; const o = item.ocr
                      return (
                        <div key={item.id} className="card">
                          <div className="flex gap-4">
                            <img src={item.imageDataUrl} className="w-24 h-24 object-cover rounded-lg border shrink-0" alt="captured" />
                            <div className="flex-1 min-w-0">
                              {isProcessing ? (
                                <div className="flex items-center gap-2 text-sm text-brand-600"><Loader2 size={14} className="animate-spin" /> OCR... {progress}%</div>
                              ) : o ? (
                                isEditing ? (
                                  <div className="space-y-2">
                                    <div><label className="text-[10px] text-gray-400 block">Ekspedisi</label><input value={editEkspedisi} onChange={e => setEditEkspedisi(e.target.value)} className="w-full px-2 py-1 text-xs border rounded" /></div>
                                    <div><label className="text-[10px] text-gray-400 block">Resi</label><input value={editResi} onChange={e => setEditResi(e.target.value)} className="w-full px-2 py-1 text-xs border rounded" /></div>
                                    <div><label className="text-[10px] text-gray-400 block">Berat</label><input value={editBerat} onChange={e => setEditBerat(e.target.value)} className="w-full px-2 py-1 text-xs border rounded" /></div>
                                    <div><label className="text-[10px] text-gray-400 block">Nama</label><input value={editNama} onChange={e => setEditNama(e.target.value)} className="w-full px-2 py-1 text-xs border rounded" /></div>
                                    <div className="flex gap-2 mt-1"><button onClick={() => saveEdit(item.id)} className="btn-blue btn-sm"><Save size={12} /> Simpan</button><button onClick={() => setEditingId(null)} className="btn-ghost btn-sm"><X size={12} /> Batal</button></div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="space-y-1">
                                        {o.ekspedisi && <p className="text-xs"><span className="text-gray-400">Ekspedisi:</span> <span className="font-medium">{o.ekspedisi}</span></p>}
                                        {o.resi && <p className="text-xs"><span className="text-gray-400">Resi:</span> <span className="font-mono">{o.resi}</span></p>}
                                        {o.berat && <p className="text-xs"><span className="text-gray-400">Berat:</span> {o.berat}</p>}
                                        {o.nama && <p className="text-xs"><span className="text-gray-400">Nama:</span> {o.nama}</p>}
                                        {!o.ekspedisi && !o.resi && !o.berat && !o.nama && <p className="text-xs text-red-400">Tidak dapat membaca teks</p>}
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        <button onClick={() => startEdit(item)} className="btn-ghost btn-sm" title="Edit"><Edit3 size={13} /></button>
                                        <button onClick={() => handleCopy(formatOneLine(o), item.id)} className="btn-ghost btn-sm" title="Copy">
                                          {copiedId === item.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                        </button>
                                        {item.uploaded ? (
                                          <span className="text-green-500 text-[10px] px-1 py-0.5" title="Tersimpan">✓</span>
                                        ) : (
                                          <button onClick={() => uploadToServer(item)} disabled={uploadingId === item.id} className="btn-ghost btn-sm text-blue-500 text-[10px]" title="Simpan ke server">
                                            {uploadingId === item.id ? <Loader2 size={12} className="animate-spin" /> : 'Simpan'}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {item.uploadError && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} />{item.uploadError}</p>}
                                    <button onClick={() => toggleCollapse(item.id)} className="text-xs text-gray-400 mt-2 hover:underline">{isCollapsed ? 'Tutup raw text' : 'Lihat raw text'}</button>
                                    {isCollapsed && <pre className="mt-2 text-[10px] text-gray-400 bg-gray-50 p-2 rounded max-h-32 overflow-auto whitespace-pre-wrap">{o.raw}</pre>}
                                  </div>
                                )
                              ) : (<p className="text-xs text-gray-300">Menunggu OCR...</p>)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
