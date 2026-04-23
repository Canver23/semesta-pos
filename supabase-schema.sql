-- ============================================================
-- SEMESTA POS — Supabase Schema
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Products
create table if not exists products (
  id          bigserial primary key,
  name        text not null,
  category    text not null default 'Lainnya',
  size        text not null default '',
  unit        text not null default 'Pcs',
  price       integer not null default 0,
  stock       integer not null default 0,
  bestseller  boolean not null default false,
  created_at  timestamptz default now()
);

-- Custom categories
create table if not exists custom_categories (
  id    bigserial primary key,
  name  text not null unique
);

-- Customers (prices stored as JSONB array)
create table if not exists customers (
  id          text primary key,  -- C001, C002, dst
  name        text not null,
  phone       text default '',
  email       text default '',
  address     text default '',
  prices      jsonb default '[]'::jsonb,
  created_at  timestamptz default now()
);

-- Invoices (items stored as JSONB array)
create table if not exists invoices (
  id          text primary key,  -- SMT-YYYYMMDD-XXXX
  cust_id     text not null,
  cust_name   text not null,
  date        text not null,
  due         text not null,
  items       jsonb default '[]'::jsonb,
  total       integer not null default 0,
  status      text not null default 'Belum Lunas',
  note        text default '',
  created_at  timestamptz default now()
);

-- Transactions (kasir)
create table if not exists transactions (
  id          text primary key,  -- SMT-YYYYMMDD-XXXX
  date        text not null,
  time        text not null,
  items       text not null,
  total       integer not null default 0,
  cash        integer not null default 0,
  change      integer not null default 0,
  method      text not null default 'Cash',
  created_at  timestamptz default now()
);

-- Attendance
create table if not exists attendance (
  id          bigserial primary key,
  type        text not null,
  date        text not null,
  time        text not null,
  timestamp   bigint not null,
  created_at  timestamptz default now()
);

-- ── Row Level Security (izinkan akses tanpa auth) ────────────
-- Untuk POS internal — semua orang yang punya URL bisa akses
-- Kalau mau lebih aman, tambahkan auth nanti

alter table products          enable row level security;
alter table custom_categories enable row level security;
alter table customers         enable row level security;
alter table invoices          enable row level security;
alter table transactions      enable row level security;
alter table attendance        enable row level security;

-- Allow all operations (internal app, no public auth)
create policy "allow_all_products"          on products          for all using (true) with check (true);
create policy "allow_all_custom_categories" on custom_categories for all using (true) with check (true);
create policy "allow_all_customers"         on customers         for all using (true) with check (true);
create policy "allow_all_invoices"          on invoices          for all using (true) with check (true);
create policy "allow_all_transactions"      on transactions      for all using (true) with check (true);
create policy "allow_all_attendance"        on attendance        for all using (true) with check (true);
