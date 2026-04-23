# Setup Supabase untuk Semesta POS

## Step 1 — Buat akun & project Supabase

1. Buka **supabase.com** → Sign Up (gratis)
2. Klik **New Project**
3. Isi:
   - Organization: buat baru atau pilih existing
   - Project name: `semesta-pos`
   - Database password: buat password yang kuat (simpan!)
   - Region: **Southeast Asia (Singapore)**
4. Klik **Create new project** — tunggu ~2 menit

---

## Step 2 — Buat tabel database

1. Di sidebar Supabase → klik **SQL Editor**
2. Klik **New Query**
3. Copy-paste isi file `supabase-schema.sql` (ada di folder project)
4. Klik **Run** (tombol hijau kanan bawah)
5. Pastikan muncul "Success. No rows returned"

---

## Step 3 — Ambil API credentials

1. Di sidebar Supabase → **Settings** → **API**
2. Copy:
   - **Project URL** → contoh: `https://abcdefgh.supabase.co`
   - **anon/public key** → string panjang mulai dari `eyJ...`

---

## Step 4A — Setup di local (dev)

Buka file `.env.local` di folder project, isi dengan credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Lalu restart dev server:
```cmd
npm run dev
```

---

## Step 4B — Setup di Vercel (production)

1. Buka **vercel.com** → pilih project `semesta-pos`
2. Klik **Settings** → **Environment Variables**
3. Tambahkan 2 variable:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |

4. Klik **Save**
5. Klik **Deployments** → **Redeploy** (pilih deployment terbaru → titik tiga → Redeploy)

---

## Step 5 — Migrasi data lama (jika ada)

Jika sebelumnya pakai localStorage dan ada data yang mau dipindahkan:

1. Buka POS di browser yang lama dipakai (komputer kasir)
2. Buka halaman **Migrasi** (sidebar paling bawah)
3. Klik "Cek Data Lokal" → verifikasi jumlah data
4. Klik "Mulai Migrasi ke Supabase"
5. Selesai — data otomatis muncul di semua perangkat

---

## Verifikasi berhasil

Setelah setup, buka Supabase → **Table Editor** → lihat tabel `products`, `customers`, dst.
Data yang kamu input di POS harus muncul di sana dalam hitungan detik.
