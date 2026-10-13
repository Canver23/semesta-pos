# 🔒 Security Hardening — Semesta POS

Dokumen ini menjelaskan **perbaikan keamanan Prioritas 1** yang sudah diterapkan.

---

## ✅ Yang Sudah Diperbaiki

### 1. **Kredensial tidak lagi ikut ter-bundle**
**Masalah lama:**
- `NEXT_PUBLIC_ADMIN_PASS` dan `NEXT_PUBLIC_ADMIN_USER` bisa dibaca di DevTools browser.
- PIN kasir juga bocor karena diverifikasi di client.

**Perbaikan:**
- Kredensial sekarang pakai env **tanpa prefix `NEXT_PUBLIC_`** → hanya ada di server.
- Verifikasi kredensial pindah ke `lib/auth-server.ts` (server-only).
- Login melalui endpoint `/api/auth/login` yang aman.

File terkait:
- `lib/auth-server.ts` — verifikasi PIN/admin (server)
- `lib/auth-client.ts` — login helper (client)
- `app/api/auth/login/route.ts` — endpoint login

---

### 2. **Sesi pakai signed token httpOnly**
**Masalah lama:**
- Cookie sesi cuma string `"admin"` atau `"kasir"` yang bisa dipalsukan.
- SessionStorage bisa diedit lewat DevTools.

**Perbaikan:**
- Token sesi sekarang HMAC-SHA256 signed dengan `AUTH_SECRET`.
- Cookie bersifat `httpOnly` (JavaScript tidak bisa baca).
- Middleware memverifikasi token di setiap request.

File terkait:
- `lib/session.ts` — create/verify token
- `middleware.ts` — validasi sesi di edge

---

### 3. **API routes dilindungi middleware**
**Masalah lama:**
- Semua endpoint `/api/*` terbuka untuk umum.
- Siapa pun bisa panggil `/api/products`, `/api/transactions`, dll tanpa login.

**Perbaikan:**
- Middleware sekarang memeriksa token sesi untuk semua `/api/*` (kecuali `/api/auth/*`).
- Endpoint admin-only (products, customers, invoices, categories, migrate) hanya bisa diakses role `admin`.
- Endpoint kasir (transactions, attendance, rekap, foto-paket) bisa diakses `kasir` dan `admin`.
- Request tanpa sesi valid → 401 Unauthorized.
- Request dengan role salah → 403 Forbidden.

File terkait:
- `middleware.ts` — gate semua API routes

---

### 4. **Rate limiting login**
**Masalah lama:**
- PIN 4 digit rawan brute-force (10.000 kombinasi).

**Perbaikan:**
- Login dibatasi 8 percobaan per 5 menit per IP per mode (kasir/admin).
- Setelah limit, server kembalikan 429 Too Many Requests + `Retry-After`.

File terkait:
- `lib/rate-limit.ts`
- `app/api/auth/login/route.ts`

---

### 5. **Supabase service-role key (opsional)**
**Masalah lama:**
- Anon key Supabase bersifat publik (ikut bundle), sementara RLS-nya `allow_all`.
- Siapa pun bisa baca kode bundle, ambil anon key, lalu akses database langsung dari DevTools/Postman.

**Perbaikan:**
- `lib/supabase.ts` sekarang prioritaskan `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS, server-only).
- Fallback ke anon key bila service key tidak diset (untuk kompatibilitas mundur).
- File SQL tambahan (`supabase-rls-hardening.sql`) mengganti RLS `allow_all` dengan `deny_anon` → anon key dari browser tidak bisa baca data.

File terkait:
- `lib/supabase.ts`
- `supabase-rls-hardening.sql`

**Setup service-role key:**
1. Buka Supabase Dashboard → Settings → API
2. Copy **service_role** key (secret!)
3. Tambahkan ke `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Jalankan SQL di `supabase-rls-hardening.sql` (Supabase SQL Editor)
5. Redeploy app

---

### 6. **Upgrade dependensi rentan (Next.js, postcss, xlsx)**
**Masalah lama:**
- `next@14.2.5` rentan terhadap **authorization bypass di middleware**, **DoS**, dan **RCE tanpa autentikasi pada server Windows** (relevan karena app dijalankan via `START_POS.bat`).
- `postcss` yang dibundel Next punya CVE (arbitrary file read via `sourceMappingURL`).
- `xlsx@0.18.5` (SheetJS dari npm) punya CVE prototype pollution & ReDoS; versi npm **tidak pernah** menerima patch.

**Perbaikan:**
- `next` → **15.5.27** (semua CVE Next.js tertutup). Breaking changes Next 15 diperbaiki: `params`/`searchParams` kini `Promise` (`await params`), `cookies()` async, `serverComponentsExternalPackages` → `serverExternalPackages`.
- `postcss` → **8.5.29** via `overrides` (menimpa postcss bundled Next).
- `xlsx` → **0.20.3** dari distribusi resmi SheetJS (`cdn.sheetjs.com`) yang sudah ditambal.
- Hasil `npm audit --omit=dev`: **0 vulnerabilities**.

File terkait:
- `package.json`, `next.config.js`, semua route handler dinamis (`app/api/*/[id]`), `app/api/auth/session/route.ts`

---

### 7. **`.env` masuk `.gitignore`**
**Masalah lama:**
- `.gitignore` cuma exclude `.env*.local`, tapi `.env` dan `.env.production` tidak.

**Perbaikan:**
- `.gitignore` sekarang block semua `.env*` kecuali `.env.example`.

---

### 8. **Debug endpoint hanya di dev**
**Masalah lama:**
- `/api/debug-env` expose kredensial di production.

**Perbaikan:**
- Endpoint sekarang cuma jalan di `NODE_ENV=development`.
- Di production return 404.

File terkait:
- `app/api/debug-env/route.ts`

---

## 🔧 Setup Production

### 1. Generate AUTH_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy hasilnya, set di Vercel Environment Variables:
```
AUTH_SECRET=<hasil generate>
```

### 2. Ganti kredensial default
Set di Vercel Environment Variables (JANGAN pakai NEXT_PUBLIC_ prefix):
```
KASIR_PIN=<PIN baru, misal 891234>
ADMIN_USER=<username admin>
ADMIN_PASS=<password kuat>
```

### 3. Setup Supabase
Sudah ada di `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # opsional tapi sangat disarankan
```

### 4. Redeploy
Di Vercel: Deployments → pilih deployment terbaru → ⋯ → Redeploy

---

## ✅ Checklist Keamanan

- [x] Kredensial tidak pernah ikut bundle browser
- [x] Sesi pakai signed token httpOnly
- [x] Semua API routes butuh autentikasi
- [x] Role-based access control (admin vs kasir)
- [x] Rate limiting login
- [x] `.env` masuk `.gitignore`
- [x] Service-role key untuk Supabase (opsional)
- [x] Debug endpoint hanya di dev
- [x] Dependensi rentan di-upgrade (Next 15.5.27, postcss 8.5.29, xlsx 0.20.3) — `npm audit --omit=dev` = 0

---

## 🧪 Cara Test

### Test 1: Kredensial tidak bocor
1. Buka DevTools → Sources → cari `admin` atau `1234` di bundle
2. Tidak boleh ada `ADMIN_PASS=` atau `KASIR_PIN=` di kode JS

### Test 2: Cookie httpOnly
1. Login sebagai admin
2. DevTools → Application → Cookies
3. Cookie `semesta-session` harus ada flag ✓ HttpOnly

### Test 3: API dilindungi
1. Logout
2. DevTools Console:
   ```js
   fetch('/api/products').then(r => r.json()).then(console.log)
   ```
3. Harus return `{error: "Tidak terautentikasi"}` status 401

### Test 4: Role enforcement
1. Login sebagai kasir
2. Console:
   ```js
   fetch('/api/products').then(r => r.json()).then(console.log)
   ```
3. Harus return `{error: "Akses ditolak"}` status 403

### Test 5: Rate limiting
1. Coba login dengan PIN salah 9 kali
2. Percobaan ke-9 harus ditolak dengan 429 Too Many Requests

### Test 6: Supabase RLS (bila sudah setup service-role)
1. Buka DevTools Console
2. Copy anon key dari Network tab (header Authorization)
3. Install Supabase di console:
   ```js
   const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
   const sb = createClient('https://xyz.supabase.co', 'eyJ...')
   const { data } = await sb.from('products').select('*')
   console.log(data)
   ```
4. Harus return `[]` (empty), bukan data asli

---

## 📝 Catatan

- Default PIN (`1234`) dan admin (`admin`/`admin123`) **hanya berlaku di development**.
- Di production, bila env kosong, login akan selalu ditolak.
- Service-role key adalah **secret**—jangan commit atau share.
- Untuk keamanan lanjutan (HTTPS, CSP, helmet.js, audit log), lihat roadmap Prioritas 2.
