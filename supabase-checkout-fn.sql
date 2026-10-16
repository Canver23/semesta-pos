-- ============================================================
-- CHECKOUT ATOMIK (WAJIB untuk integritas data)
-- Jalankan di Supabase Dashboard → SQL Editor → New Query → Run.
-- ============================================================
--
-- MASALAH YANG DIPERBAIKI
-- Sebelumnya checkout dilakukan dari browser dengan urutan:
--   1. POST /api/transactions   (catat penjualan)
--   2. PUT  /api/products/N     (kurangi stok) — diulang untuk tiap produk
-- Bila langkah 2 gagal di tengah jalan (jaringan putus, tab ditutup,
-- stok sudah diubah kasir lain), penjualan SUDAH tercatat tapi stok
-- TIDAK berkurang → stok di sistem jadi lebih besar dari barang fisik.
-- Dua kasir yang menjual barang terakhir juga bisa membuat stok minus.
--
-- SOLUSI
-- Seluruh checkout dijalankan sebagai SATU transaksi database di server:
-- baris produk dikunci (FOR UPDATE), stok diperiksa dan dikurangi, lalu
-- transaksi penjualan dicatat. Bila ada satu saja yang gagal, Postgres
-- membatalkan SEMUANYA — tidak ada penjualan tercatat tanpa stok terpotong,
-- dan tidak ada stok terpotong tanpa penjualan tercatat.
--
-- Fungsi ini mengembalikan stok terbaru supaya tampilan kasir ikut tersinkron.

create or replace function checkout(
  p_tx_id      text,
  p_date       text,
  p_time       text,
  p_items_text text,          -- ringkasan teks, mis. "Kresek ×2, Sterofoam ×1"
  p_total      integer,
  p_cash       integer,
  p_change     integer,
  p_method     text,
  p_items      jsonb          -- [{id, name, qty, unit, variant}] — harga dari server
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line      jsonb;
  v_pid       integer;
  v_qty       numeric;
  v_var       text;
  v_stock     numeric;
  v_variants  jsonb;
  v_updated   jsonb := '[]'::jsonb;
  v_tx        jsonb;
  -- variabel penampung hasil UPDATE
  r_id        integer;
  r_name      text;
  r_stock     numeric;
  r_variants  jsonb;
begin
  -- Tolak checkout tanpa item
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;

  -- ── 1. Kunci & kurangi stok tiap produk ─────────────────────
  for v_line in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_line->>'id')::integer;
    v_qty := (v_line->>'qty')::numeric;
    v_var := nullif(v_line->>'variant', '');

    if v_qty is null or v_qty <= 0 then
      raise exception 'Jumlah tidak valid untuk produk %', v_pid;
    end if;

    -- FOR UPDATE: baris dikunci sampai transaksi selesai, sehingga kasir
    -- lain tidak bisa membaca stok lama dan menjual barang yang sama.
    select stock, variants into v_stock, v_variants
      from products where id = v_pid for update;

    if not found then
      raise exception 'Produk % tidak ditemukan', v_pid;
    end if;

    if v_var is not null and v_variants is not null and jsonb_array_length(v_variants) > 0 then
      -- Varian: stok varian harus cukup
      if not exists (
        select 1 from jsonb_array_elements(v_variants) e
        where e->>'id' = v_var and (e->>'stock')::numeric >= v_qty
      ) then
        raise exception 'Stok varian % pada produk % tidak cukup', v_var, v_pid;
      end if;
      v_variants := (
        select jsonb_agg(
          case when e->>'id' = v_var
               then jsonb_set(e, '{stock}', to_jsonb((e->>'stock')::numeric - v_qty))
               else e end
        ) from jsonb_array_elements(v_variants) e
      );
    else
      if v_stock < v_qty then
        raise exception 'Stok produk % tidak cukup (tersedia %, diminta %)', v_pid, v_stock, v_qty;
      end if;
    end if;

    update products
       set stock    = greatest(0, stock - v_qty),
           variants = coalesce(v_variants, variants)
     where id = v_pid
     returning id, name, stock, variants into r_id, r_name, r_stock, r_variants;

    -- kumpulkan stok terbaru untuk dikirim balik ke kasir
    v_updated := v_updated || jsonb_build_object(
      'id', r_id, 'name', r_name, 'stock', r_stock, 'variants', r_variants
    );
  end loop;

  -- ── 2. Catat penjualan ──────────────────────────────────────
  insert into transactions (id, date, time, items, total, cash, change, method)
  values (p_tx_id, p_date, p_time, p_items_text, p_total, p_cash, p_change, coalesce(p_method, 'Cash'))
  returning to_jsonb(transactions.*) into v_tx;

  return jsonb_build_object('transaction', v_tx, 'products', v_updated);
end;
$$;

-- Hanya server (service role / API route) yang boleh memanggil fungsi ini.
revoke all on function checkout(text, text, text, text, integer, integer, integer, text, jsonb) from public, anon, authenticated;
grant execute on function checkout(text, text, text, text, integer, integer, integer, text, jsonb) to service_role;

-- ✅ Selesai. Uji dari SQL Editor (akan dibatalkan otomatis karena di luar transaksi valid):
--    select checkout('TES-1','16/10/2026','10:00','uji',1000,1000,0,'Cash','[{"id":1,"qty":1}]'::jsonb);
