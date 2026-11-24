-- MH Fashion — Initial Schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New Query).
-- Covers: products, admin-configurable attribute system, orders, user designs.

create extension if not exists "pgcrypto";

-- ============================================================
-- USERS (extends Supabase auth.users with app-specific profile data)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  address text,
  currency_preference text default 'Ks' check (currency_preference in ('Ks', 'USD')),
  theme_preference text default 'dark' check (theme_preference in ('dark', 'light')),
  daily_points integer not null default 0,
  purchase_points integer not null default 0,
  daily_points_granted_on date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sub_brand text, -- Sticker / Singular / Kids / Streetwear / Sport / Accessories
  is_customizable text not null default 'full' check (is_customizable in ('full', 'none', 'partial')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- ADMIN-CONFIGURABLE ATTRIBUTE SYSTEM
-- ============================================================
create table public.attribute_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,           -- e.g. "Print Method", "Fabric Type", "GSM"
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_type_id uuid not null references public.attribute_types(id) on delete cascade,
  value text not null,          -- e.g. "DTF", "Combed Cotton", "180"
  created_at timestamptz not null default now()
);

-- Which attribute types apply to which product
create table public.product_attribute_types (
  product_id uuid not null references public.products(id) on delete cascade,
  attribute_type_id uuid not null references public.attribute_types(id) on delete cascade,
  primary key (product_id, attribute_type_id)
);

-- Cascading rule: selecting `when_value` on `when_attribute_type` restricts
-- `target_attribute_type` to only `allowed_value` (hide everything else).
create table public.attribute_cascade_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  when_attribute_type_id uuid not null references public.attribute_types(id),
  when_value_id uuid not null references public.attribute_values(id),
  target_attribute_type_id uuid not null references public.attribute_types(id),
  allowed_value_id uuid not null references public.attribute_values(id)
);

-- Price per full attribute combination
create table public.product_attribute_pricing (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  attribute_selection jsonb not null, -- { "print_method": "DTF", "gsm": "180", ... }
  price_ks numeric not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- USER DESIGNS ("My Design", 3-limit, admin-configurable)
-- ============================================================
create table public.platform_settings (
  key text primary key,
  value text not null
);
insert into public.platform_settings (key, value) values
  ('max_saved_designs_per_user', '3'),
  ('exchange_rate_ks_per_usd', '4500');

create table public.user_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id),
  canvas_state jsonb not null, -- Front/Back layer trees, positions, colors, text
  mockup_attach_status text not null default 'incomplete' check (mockup_attach_status in ('incomplete', 'completed')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- ORDERS
-- ============================================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  delivery_provider text check (delivery_provider in ('mh_delivery', 'dhl')),
  delivery_fee_ks numeric not null default 0,
  product_total_ks numeric not null default 0,
  final_total_ks numeric not null default 0,
  order_status text not null default 'pending_payment' check (
    order_status in (
      'pending_payment', 'confirmed', 'processing', 'printing',
      'ready_to_ship', 'handed_to_delivery', 'out_for_delivery',
      'delivered', 'cancelled', 'refunded'
    )
  ),
  delivery_settlement_status text not null default 'pending' check (delivery_settlement_status in ('pending', 'settled')),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  design_id uuid references public.user_designs(id),
  attribute_selection jsonb not null,
  quantity integer not null default 1,
  unit_price_ks numeric not null,
  design_svg_url text,
  placement_coordinates jsonb -- { front: {x,y,width,height,rotation}, back: {...} }
);

-- ============================================================
-- ROW LEVEL SECURITY (basic starting policies — refine per role later)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.user_designs enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Users can view/edit their own profile"
  on public.profiles for all
  using (auth.uid() = id);

create policy "Users can manage their own designs"
  on public.user_designs for all
  using (auth.uid() = user_id);

create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Users can view their own order items"
  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
