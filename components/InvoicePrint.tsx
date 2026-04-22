'use client'
import { fmtDate, fmt, STORE_INFO } from '@/lib/utils'
import type { Invoice } from '@/lib/types'

interface Props {
  invoice: Invoice
}

export default function InvoicePrint({ invoice }: Props) {
  return (
    <div
      id="invoice-print-area"
      style={{ display: 'none' }}
      className="font-mono text-xs bg-white p-8"
    >
      {/* Title */}
      <div className="text-center text-xl font-bold tracking-widest mb-5">
        INVOICE
      </div>

      {/* Meta */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
        <div>
          <span className="text-gray-500">No Invoice: </span>
          <span className="font-bold">{invoice.id}</span>
        </div>
        <div>
          <span className="text-gray-500">Kepada Yth. </span>
          <br />
          <span className="font-bold">{invoice.custName}</span>
          <br />
          <span className="text-gray-500">Tanggal </span>
          <span className="font-bold">{fmtDate(invoice.date)}</span>
        </div>
        <div className="text-right">
          <span className="text-gray-500">Kasir: </span>
          <span className="font-bold">ADMIN</span>
          <br />
          <span className="font-bold">{fmtDate(invoice.date)}</span>
        </div>
      </div>

      {/* Items table */}
      <table className="w-full border-collapse text-xs mb-4">
        <thead>
          <tr className="bg-gray-100">
            {['Nama Barang', 'Ukuran', 'Qty', 'Satuan', 'Harga Satuan', 'Total'].map((h) => (
              <th key={h} className="border border-gray-400 px-2 py-1.5 text-center font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i}>
              <td className="border border-gray-400 px-2 py-1">{item.name}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{item.size || '-'}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{item.qty}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{item.unit}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{fmt(item.price)}</td>
              <td className="border border-gray-400 px-2 py-1 text-right font-medium">{fmt(item.total)}</td>
            </tr>
          ))}
          {/* Blank rows to fill space */}
          {Array.from({ length: Math.max(0, 8 - invoice.items.length) }).map((_, i) => (
            <tr key={`blank-${i}`}>
              {Array.from({ length: 6 }).map((_, j) => (
                <td key={j} className="border border-gray-400 px-2 py-3">&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        {/* Payment info */}
        <div className="border border-gray-400 p-3 text-xs">
          <div className="font-bold text-center border-b border-gray-400 pb-1.5 mb-2">
            Pembayaran
          </div>
          <table className="w-full">
            <tbody>
              <tr>
                <td className="text-gray-600">A/n:</td>
                <td className="font-bold">{STORE_INFO.bankAN}</td>
              </tr>
              <tr>
                <td className="text-gray-600">Giro / Transfer: {STORE_INFO.bank}</td>
                <td className="font-bold">{STORE_INFO.bankAcc}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div>
          <div className="border border-gray-400 px-4 py-3 flex justify-between items-center mb-2">
            <span className="font-bold text-sm">TOTAL</span>
            <span className="font-bold text-sm">{fmt(invoice.total)}</span>
          </div>
          {invoice.note && (
            <p className="text-xs text-gray-500">Catatan: {invoice.note}</p>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-10 mt-8 text-xs">
        <div className="text-center">
          <p>Tanda Terima</p>
          <div className="border-t border-gray-500 mt-10 pt-1">(___________________)</div>
        </div>
        <div className="text-center">
          <p>Hormat Kami,</p>
          <div className="border-t border-gray-500 mt-10 pt-1">(___________________)</div>
        </div>
      </div>
    </div>
  )
}
