-- ================================================================
--  ZENITH CONTROL CENTER — Supabase Schema
--  Ejecuta este SQL en: Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────
-- SETTINGS (tasa de cambio, config global)
-- ──────────────────────────────────────────────
create table if not exists settings (
  id             uuid primary key default uuid_generate_v4(),
  exchange_rate  numeric(10,2) not null default 540,
  updated_at     timestamptz default now()
);
-- Insertar registro inicial
insert into settings (exchange_rate) values (540)
on conflict do nothing;

-- ──────────────────────────────────────────────
-- TRANSACTIONS (ingresos y gastos)
-- ──────────────────────────────────────────────
create table if not exists transactions (
  id           uuid primary key default uuid_generate_v4(),
  type         text not null check (type in ('income','expense')),
  category     text not null,
  description  text not null,
  amount       numeric(12,2) not null,
  currency     text not null check (currency in ('CUP','USD')),
  cup_equiv    numeric(12,2) not null,
  created_at   timestamptz default now()
);
create index if not exists idx_tx_type       on transactions(type);
create index if not exists idx_tx_created_at on transactions(created_at desc);

-- ──────────────────────────────────────────────
-- PRODUCTS (inventario)
-- ──────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  category    text not null,
  stock       integer not null default 0,
  price_cup   numeric(10,2) not null default 0,
  price_usd   numeric(10,2) not null default 0,
  created_at  timestamptz default now()
);

-- Productos iniciales de ejemplo
insert into products (name, category, stock, price_cup, price_usd) values
  ('Cargador 65W USB-C',  'Cargadores',   8,  2500, 5.00),
  ('Cargador 33W Turbo',  'Cargadores',   5,  2000, 4.00),
  ('Cable USB-C 2m',      'Accesorios',  12,   800, 1.50),
  ('Pasta Térmica 5g',    'Componentes',  3,  1500, 3.00),
  ('Módulo WiFi ESP32',   'Componentes',  2,  3200, 6.00)
on conflict do nothing;

-- ──────────────────────────────────────────────
-- SALES (ventas)
-- ──────────────────────────────────────────────
create table if not exists sales (
  id            uuid primary key default uuid_generate_v4(),
  product_id    uuid references products(id),
  product_name  text not null,
  category      text,
  quantity      integer not null,
  unit_price    numeric(10,2) not null,
  total         numeric(12,2) not null,
  currency      text not null check (currency in ('CUP','USD')),
  cup_equiv     numeric(12,2) not null,
  client        text not null default 'Cliente anónimo',
  notes         text default '',
  created_at    timestamptz default now()
);
create index if not exists idx_sales_created_at on sales(created_at desc);

-- ──────────────────────────────────────────────
-- SERVICE ORDERS (servicios técnicos)
-- ──────────────────────────────────────────────
create table if not exists service_orders (
  id              uuid primary key default uuid_generate_v4(),
  client          text not null,
  phone           text default '',
  address         text default '',
  service_type    text not null,
  description     text not null,
  status          text not null default 'Pendiente'
                  check (status in ('Pendiente','En Proceso','Cobrado')),
  price           numeric(10,2) not null default 0,
  currency        text not null default 'CUP' check (currency in ('CUP','USD')),
  manager         text default '',
  commission_pct  numeric(5,2) default 0,
  notes           text default '',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_orders_status     on service_orders(status);
create index if not exists idx_orders_created_at on service_orders(created_at desc);

-- Trigger para updated_at automático
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger service_orders_updated_at
  before update on service_orders
  for each row execute function update_updated_at();

-- ──────────────────────────────────────────────
-- GOALS (metas de ahorro)
-- ──────────────────────────────────────────────
create table if not exists goals (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  emoji          text default '🎯',
  target_amount  numeric(12,2) not null,
  currency       text not null default 'CUP',
  allocated      numeric(12,2) not null default 0,
  color          text default 'cyan',
  created_at     timestamptz default now()
);

insert into goals (name, emoji, target_amount, currency, allocated, color) values
  ('Suplementos Mensuales', '🥤',  20000,  'CUP', 0, 'cyan'),
  ('Moto Propia',           '🏍️',  400000, 'CUP', 0, 'purple'),
  ('Viaje a Varadero',      '🏖️',  80000,  'CUP', 0, 'gold')
on conflict do nothing;

-- ──────────────────────────────────────────────
-- BODY STATS (seguimiento físico)
-- ──────────────────────────────────────────────
create table if not exists body_stats (
  id           uuid primary key default uuid_generate_v4(),
  date         date not null default current_date,
  weight       numeric(5,2) not null,
  bench_press  numeric(5,2) not null default 0,
  bicep_curl   numeric(5,2) not null default 0,
  notes        text default '',
  created_at   timestamptz default now()
);
create index if not exists idx_body_stats_date on body_stats(date desc);

-- ================================================================
-- RLS (Row Level Security) — Desactivado para uso personal
-- Si en el futuro añades auth, actívalo aquí
-- ================================================================
alter table settings       disable row level security;
alter table transactions   disable row level security;
alter table products       disable row level security;
alter table sales          disable row level security;
alter table service_orders disable row level security;
alter table goals          disable row level security;
alter table body_stats     disable row level security;
