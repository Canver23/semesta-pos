-- ============================================================
-- SUPABASE RLS HARDENING (OPSIONAL)
-- Jalankan SETELAH setup awal (supabase-schema.sql).
-- ============================================================
-- 
-- File ini menghapus policy allow_all dan mengganti dengan RLS ketat.
-- HANYA diperlukan bila Anda sudah setup service-role key di SUPABASE_SERVICE_ROLE_KEY.
-- Tanpa service-role key, middleware tetap melindungi API routes,
-- tapi anon key langsung dari browser MASIH bisa akses database.
--
-- Dengan file ini + service-role key:
--   ✓ Middleware memeriksa sesi
--   ✓ API routes pakai service-role key (bypass RLS)
--   ✓ Anon key dari browser ditolak RLS (semua tabel return kosong)
--
-- Setup:
-- 1. Ambil service-role key: Supabase Dashboard → Settings → API → service_role (secret!)
-- 2. Set di .env: SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUz...
-- 3. Jalankan SQL ini: Supabase Dashboard → SQL Editor → New Query → paste → Run
-- 4. Deploy ulang app (Vercel redeploy / restart local dev server)

-- ── Drop policy lama ─────────────────────────────────────────
drop policy if exists "allow_all_products"          on products;
drop policy if exists "allow_all_custom_categories" on custom_categories;
drop policy if exists "allow_all_customers"         on customers;
drop policy if exists "allow_all_invoices"          on invoices;
drop policy if exists "allow_all_transactions"      on transactions;
drop policy if exists "allow_all_attendance"        on attendance;
drop policy if exists "allow_all_foto_paket"        on foto_paket;
drop policy if exists "allow_all_rekap_paket"       on rekap_paket;

-- ── Policy baru: tolak semua akses anon/public ───────────────
-- Service role key bypass RLS, jadi API routes tetap jalan.
-- Anon key (yang bocor ke browser) tidak bisa apa-apa.

create policy "deny_anon_products"          on products          using (false);
create policy "deny_anon_custom_categories" on custom_categories using (false);
create policy "deny_anon_customers"         on customers         using (false);
create policy "deny_anon_invoices"          on invoices          using (false);
create policy "deny_anon_transactions"      on transactions      using (false);
create policy "deny_anon_attendance"        on attendance        using (false);
create policy "deny_anon_foto_paket"        on foto_paket        using (false);
create policy "deny_anon_rekap_paket"       on rekap_paket       using (false);

-- ✅ Selesai. Coba akses dari DevTools browser:
--    const { data } = await supabase.from('products').select('*')
--    → harus return [] (empty), bukan data asli.
