-- ════════════════════════════════════════════════════════════
-- Semesta POS — migrasi stok desimal
-- Jalankan SEKALI di Supabase → SQL Editor → New query → Run.
-- Aman diulang (idempotent).
-- ════════════════════════════════════════════════════════════

-- Stok boleh pecahan (produk dijual per Kg / Liter, mis. 0.5 Kg)
alter table products
  alter column stock type numeric(12,3) using stock::numeric;

alter table products
  alter column stock set default 0;

-- Cek hasil
select column_name, data_type, numeric_precision, numeric_scale
from information_schema.columns
where table_name = 'products' and column_name = 'stock';
