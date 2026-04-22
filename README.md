# Semesta POS

Point of Sale untuk **Semesta Plastik** — dibangun dengan Next.js 14, TypeScript, Tailwind CSS, dan Zustand.

---

## Fitur

| Modul | Fitur |
|---|---|
| **Kasir** | Grid produk + kategori, cart, payment modal, kembalian otomatis, struk print |
| **Dashboard** | Metrik harian, total pendapatan, piutang belum lunas, riwayat transaksi |
| **Inventori** | CRUD produk, filter kategori, tandai terlaris, stok |
| **Pelanggan** | Database pelanggan + **harga khusus per pelanggan per produk** |
| **Invoice** | Buat invoice formal, harga khusus otomatis, print invoice dot-matrix style |
| **Absensi** | Check in / Check out dengan timestamp |

Data disimpan di **localStorage** (persist antar session, tanpa backend).

---

## Quick Start

```bash
# 1. Clone / download project ini
cd semesta-pos

# 2. Install dependencies
npm install

# 3. Jalankan dev server
npm run dev

# 4. Buka browser
open http://localhost:3000
```

---

## Deploy ke Vercel

### Cara 1 — GitHub (Recommended)

```bash
# Buat repo GitHub baru, lalu:
git init
git add .
git commit -m "init: Semesta POS"
git remote add origin https://github.com/USERNAME/semesta-pos.git
git push -u origin main
```

Kemudian:
1. Buka [vercel.com](https://vercel.com) → **New Project**
2. Import repo `semesta-pos`
3. Vercel otomatis detect Next.js → klik **Deploy**
4. Selesai! URL live dalam ~1 menit.

### Cara 2 — Vercel CLI

```bash
npm i -g vercel
vercel
# ikuti prompt, pilih project baru
```

---

## Struktur Project

```
semesta-pos/
├── app/
│   ├── page.tsx              # Kasir (POS utama)
│   ├── dashboard/page.tsx    # Dashboard & analytics
│   ├── inventory/page.tsx    # Manajemen produk
│   ├── customers/page.tsx    # Database pelanggan + harga khusus
│   ├── invoices/page.tsx     # Invoice formal
│   ├── attendance/page.tsx   # Absensi
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── Sidebar.tsx           # Navigasi sidebar
│   ├── InvoicePrint.tsx      # Komponen print invoice
│   └── ui/
│       └── Modal.tsx         # Reusable modal
├── lib/
│   ├── types.ts              # TypeScript interfaces
│   ├── data.ts               # Seed / mock data awal
│   ├── store.ts              # Zustand global store
│   └── utils.ts              # Helper functions
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Konfigurasi Toko

Edit file `lib/utils.ts` bagian `STORE_INFO`:

```ts
export const STORE_INFO = {
  name:    'Semesta Plastik',      // Nama toko di struk & invoice
  address: 'Jl. Contoh No. 1, Bandung',
  bank:    'BCA',
  bankAcc: '3461191698',           // Nomor rekening
  bankAN:  'Lie Tin Liung',        // Atas nama
}
```

---

## Upgrade ke Database (Opsional)

Saat ini data pakai `localStorage`. Untuk produksi multi-device, replace store dengan:

- **Supabase** (PostgreSQL gratis) — recommended
- **PlanetScale** (MySQL)
- **Prisma + Neon**

Struktur tabel sudah sesuai dengan `lib/types.ts`.

---

## Tech Stack

- [Next.js 14](https://nextjs.org) — App Router
- [TypeScript](https://typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand](https://github.com/pmndrs/zustand) — state management + localStorage persist
- [Lucide React](https://lucide.dev) — icons
- [date-fns](https://date-fns.org) — date formatting
