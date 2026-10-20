import type { Invoice } from './types'
import { fmt, fmtDate, STORE_INFO } from './utils'

export type PrintMode = 'invoice' | 'thermal'

// ─────────────────────────────────────────────────────────────
// BUILD INVOICE HTML — 21×14cm (printer desktop)
// ─────────────────────────────────────────────────────────────
export function buildInvoiceHTML(inv: Invoice): string {
  const TOTAL_ROWS = 14
  const itemRows = inv.items.map(item => `
    <tr>
      <td class="td-left">${item.name}</td>
      <td class="td-center">${item.size || ''}</td>
      <td class="td-center">${item.qty}</td>
      <td class="td-center">${item.unit}</td>
      <td class="td-right">${fmt(item.price)}</td>
      <td class="td-right">${fmt(item.total)}</td>
    </tr>`).join('')

  const blanks = Array.from({ length: Math.max(0, TOTAL_ROWS - inv.items.length) })
    .map(() => `<tr>${Array(6).fill('<td class="td-blank"></td>').join('')}</tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.id}</title>
  <style>
    @page { size: 21cm 14cm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 10pt; background: white;
           width: 21cm; height: 14cm; padding: 4mm 6mm 3mm 6mm; overflow: hidden; }
    .inv-title { text-align:center; font-size:16pt; font-weight:bold; letter-spacing:4px; margin-bottom:2mm; }
    .top-line  { border-top:2px solid #000; margin-bottom:1.5mm; }
    .header-row { display:grid; grid-template-columns:1fr 1fr; margin-bottom:1.5mm; font-size:9.5pt; }
    .header-right { text-align:right; }
    .items-table { width:100%; border-collapse:collapse; font-size:9.5pt; margin-bottom:1mm; }
    .items-table th { border:1px solid #000; padding:1.5mm 2mm; text-align:center; font-weight:bold; }
    .items-table td { border:1px solid #000; padding:1mm 2mm; height:5.2mm; }
    .td-left{text-align:left;} .td-center{text-align:center;} .td-right{text-align:right;} .td-blank{border:1px solid #000;height:5.2mm;}
    col.col-nama{width:35%;} col.col-ukuran{width:12%;} col.col-qty{width:8%;}
    col.col-satuan{width:11%;} col.col-harga{width:17%;} col.col-total{width:17%;}
    .bottom-line { border-top:1px solid #000; margin:1mm 0; }
    .footer { display:grid; grid-template-columns:42% 58%; gap:3mm; font-size:9pt; }
    .pengirim-row { display:grid; grid-template-columns:1fr 1fr; border:1px solid #000; }
    .pengirim-label,.pengirim-val { padding:1mm 2mm; }
    .pengirim-val { border-left:1px solid #000; }
    .pembayaran-box { border:1px solid #000; border-top:none; }
    .pembayaran-header { text-align:center; font-weight:bold; border-bottom:1px solid #000; padding:1mm; }
    .pembayaran-row { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid #000; }
    .pembayaran-row:last-child { border-bottom:none; }
    .p-label,.p-val { padding:1mm 2mm; }
    .p-val { border-left:1px solid #000; }
    .total-section { display:grid; grid-template-columns:1fr 1fr; margin-bottom:0.5mm; }
    .total-box-label { border:1px solid #000; padding:1.5mm 3mm; font-weight:bold; text-align:center; font-size:10pt; }
    .total-box-val   { border:1px solid #000; border-left:none; padding:1.5mm 3mm; text-align:right; font-weight:bold; font-size:10pt; }
    .signatures { display:grid; grid-template-columns:1fr 1fr; gap:4mm; text-align:center; margin-top:1.5mm; font-size:9pt; }
    .sig-line { border-top:1px solid #000; margin-top:13mm; padding-top:1mm; }
  </style></head><body>
  <div class="inv-title">I N V O I C E</div>
  <div class="top-line"></div>
  <div class="header-row">
    <div>No Invoice: <strong>${inv.id}</strong></div>
    <div class="header-right">
      Kepada Yth, <strong>${inv.custName || 'Pembeli Umum'}</strong> &nbsp;&nbsp; <strong>ADMIN</strong><br>
      Tanggal <strong>${fmtDate(inv.date)}</strong>
    </div>
  </div>
  <table class="items-table">
    <colgroup><col class="col-nama"><col class="col-ukuran"><col class="col-qty">
    <col class="col-satuan"><col class="col-harga"><col class="col-total"></colgroup>
    <thead><tr>
      <th>Nama Barang</th><th>Ukuran</th><th>Qty</th>
      <th>Satuan</th><th>Harga Satuan</th><th>Total</th>
    </tr></thead>
    <tbody>${itemRows}${blanks}</tbody>
  </table>
  <div class="bottom-line"></div>
  <div class="footer">
    <div>
      <div class="pengirim-row">
        <div class="pengirim-label">Pengirim:</div>
        <div class="pengirim-val"></div>
      </div>
      <div class="pembayaran-box">
        <div class="pembayaran-header">Pembayaran</div>
        <div class="pembayaran-row"><div class="p-label">A/n:</div><div class="p-val">${STORE_INFO.bankAN}</div></div>
        <div class="pembayaran-row"><div class="p-label">Giro / Transfer: ${STORE_INFO.bank}</div><div class="p-val">${STORE_INFO.bankAcc}</div></div>
      </div>
    </div>
    <div>
      <div class="total-section">
        <div class="total-box-label">TOTAL</div>
        <div class="total-box-val">${fmt(inv.total)}</div>
      </div>
      ${inv.note ? `<p style="font-size:8pt;color:#666;margin:1mm 0;">Catatan: ${inv.note}</p>` : ''}
      <div class="signatures">
        <div>Tanda Terima<div class="sig-line">(_____________)</div></div>
        <div>Hormat Kami,<div class="sig-line">(_____________)</div></div>
      </div>
    </div>
  </div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},800);}</script>
  </body></html>`
}

// ─────────────────────────────────────────────────────────────
// CSS THERMAL — hitam pekat, huruf tebal (printer thermal tipis kalau
// warna abu-abu / weight normal / garis putus-putus)
// ─────────────────────────────────────────────────────────────
function money(n: number) { return fmt(n).replace(/^Rp\s*/, '') }

function thermalCSS(paperWidth: '58mm' | '80mm', w: string): string {
  const s = paperWidth === '58mm'
  return `
    @page { size: ${paperWidth} auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Courier New', Consolas, monospace; font-weight: 700;
           font-size: ${s ? '9.5pt' : '10.5pt'}; line-height: 1.4; color: #000;
           width: ${w}; padding: 2mm 2mm 8mm; background: white;
           -webkit-font-smoothing: none; text-rendering: optimizeSpeed; }
    .center { text-align: center; }
    .store-name { font-size: ${s ? '14pt' : '15pt'}; font-weight: 800; text-align: center; }
    .divider { border-top: 1px solid #000; margin: 1.5mm 0; }
    .divider-solid { border-top: 2px solid #000; margin: 2mm 0; }
    .meta { font-size: ${s ? '8.5pt' : '9pt'}; text-align: center; }
    .item-row { margin: 1.8mm 0; }
    .item-name { font-weight: 800; font-size: ${s ? '9.5pt' : '10.5pt'}; word-break: break-word; }
    .item-detail { display: flex; justify-content: space-between; gap: 1.5mm; font-size: ${s ? '8.5pt' : '9.5pt'}; }
    .item-detail > span { white-space: nowrap; }
    .item-detail > span:first-child { min-width: 0; overflow: hidden; }
    .total-row { display: flex; justify-content: space-between; font-size: ${s ? '12pt' : '13pt'}; font-weight: 800; padding: 1mm 0; }
    .sub-row { display: flex; justify-content: space-between; font-size: ${s ? '9pt' : '10pt'}; padding: 0.5mm 0; }
    .footer-text { text-align: center; font-size: ${s ? '8.5pt' : '9pt'}; margin-top: 2mm; }
    .no-inv { font-size: ${s ? '8.5pt' : '9pt'}; text-align: center; }
    .sig-section { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 4mm; font-size: ${s ? '8.5pt' : '9pt'}; text-align: center; }
    .sig-line { border-top: 1px solid #000; margin-top: 10mm; padding-top: 1mm; }`
}

// ─────────────────────────────────────────────────────────────
// BUILD THERMAL HTML — 58mm / 80mm (bluetooth printer HP)
// ─────────────────────────────────────────────────────────────
export function buildThermalHTML(inv: Invoice, paperWidth: '58mm' | '80mm' = '58mm'): string {
  const w = paperWidth === '58mm' ? '54mm' : '76mm'
  const itemRows = inv.items.map(item => `
    <div class="item-row">
      <div class="item-name">${item.name}${item.size ? ` (${item.size})` : ''}</div>
      <div class="item-detail">
        <span>${item.qty} ${item.unit} × ${money(item.price)}</span>
        <span><strong>${fmt(item.total)}</strong></span>
      </div>
    </div>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.id}</title>
  <style>${thermalCSS(paperWidth, w)}</style></head><body>
  <div class="store-name">${STORE_INFO.name}</div>
  <div class="divider"></div>
  <div class="no-inv">${inv.id}</div>
  <div class="center meta">Kepada: <strong>${inv.custName || 'Pembeli Umum'}</strong></div>
  <div class="center meta">Tanggal: ${fmtDate(inv.date)}</div>
  <div class="divider"></div>
  ${itemRows}
  <div class="divider-solid"></div>
  <div class="total-row"><span>TOTAL</span><span>${fmt(inv.total)}</span></div>
  ${inv.note ? `<div class="meta" style="margin-top:1mm;">Catatan: ${inv.note}</div>` : ''}
  <div class="divider"></div>
  <div class="footer-text">A/n: ${STORE_INFO.bankAN}</div>
  <div class="footer-text">Transfer ${STORE_INFO.bank}: ${STORE_INFO.bankAcc}</div>
  <div class="sig-section">
    <div>Tanda Terima<div class="sig-line">(__________)</div></div>
    <div>Hormat Kami,<div class="sig-line">(__________)</div></div>
  </div>
  <div class="footer-text" style="margin-top:5mm;">Terima kasih!</div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},800);}</script>
  </body></html>`
}

// ─────────────────────────────────────────────────────────────
// BUILD THERMAL STRUK — untuk transaksi kasir (bukan invoice)
// ─────────────────────────────────────────────────────────────
export function buildThermalStrukHTML(
  trx: { id: string; date: string; time: string; total: number; cash: number; change: number },
  items: { name: string; qty: number; unit: string; price?: number }[],
  paperWidth: '58mm' | '80mm' = '58mm'
): string {
  const w = paperWidth === '58mm' ? '54mm' : '76mm'
  const itemRows = items.map(item => `
    <div class="item-row">
      <div class="item-name">${item.name}</div>
      <div class="item-detail">
        <span>${item.qty} ${item.unit}${item.price ? ` × ${money(item.price)}` : ''}</span>
        <span>${item.price ? `<strong>${fmt(item.price * item.qty)}</strong>` : ''}</span>
      </div>
    </div>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Struk ${trx.id}</title>
  <style>${thermalCSS(paperWidth, w)}</style></head><body>
  <div class="store-name">${STORE_INFO.name}</div>
  <div class="divider"></div>
  <div class="meta">${trx.date} ${trx.time}</div>
  <div class="meta">${trx.id}</div>
  <div class="divider"></div>
  ${itemRows}
  <div class="divider-solid"></div>
  <div class="total-row"><span>TOTAL</span><span>${fmt(trx.total)}</span></div>
  <div class="sub-row"><span>Cash</span><span>${fmt(trx.cash)}</span></div>
  <div class="sub-row"><span>Kembalian</span><span>${fmt(trx.change)}</span></div>
  <div class="divider"></div>
  <div class="footer-text">Terima kasih sudah berbelanja!</div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},800);}</script>
  </body></html>`
}

// ─────────────────────────────────────────────────────────────
// OPEN PRINT POPUP
// ─────────────────────────────────────────────────────────────
export function openPrintPopup(html: string) {
  const w = window.open('', '_blank', 'width=900,height=650')
  if (!w) {
    alert('Pop-up diblokir browser.\nIzinkan pop-up di address bar → klik ikon kunci → izinkan pop-up.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

// ─── Convenience functions ────────────────────────────────────
export const printInvoiceA4   = (inv: Invoice) => openPrintPopup(buildInvoiceHTML(inv))
export const printInvoice58mm = (inv: Invoice) => openPrintPopup(buildThermalHTML(inv, '58mm'))
export const printInvoice80mm = (inv: Invoice) => openPrintPopup(buildThermalHTML(inv, '80mm'))
