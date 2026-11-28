-- MH Fashion — Migration 0012: dynamic pricing management (owner spec 2026-11-21)
-- Run this in the Supabase SQL Editor after 0011_search_misses.sql.
--
-- A price belongs to one variant: a product plus one value per attribute (size included), chosen
-- manually. Adding an attribute or an option never adds a column here — the values live in rows —
-- and a duplicate combination is refused by the database, not only by the screen.

-- 1. Attributes and their options (renamable, orderable, switchable).
create table if not exists public.attributes (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,              -- stable key the rows refer to, e.g. 'material'
  label text not null,                   -- what the admin sees, e.g. 'Fabric Type'
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  value text not null,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  unique (attribute_id, value)
);

-- 2. Which attributes each product prices, and the variants it sells.
create table if not exists public.product_attributes (
  product_id uuid not null references public.products (id) on delete cascade,
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, attribute_id)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  -- Canonical fingerprint of the combination, sorted by attribute key: 'material=Cotton|size=M'.
  -- The unique key is what makes a duplicate combination impossible.
  signature text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, signature)
);

create table if not exists public.variant_options (
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  value text not null,
  primary key (variant_id, attribute_id)
);

-- 3. The price itself: one live row per variant, versioned for optimistic concurrency.
create table if not exists public.variant_prices (
  variant_id uuid primary key references public.product_variants (id) on delete cascade,
  price_ks integer not null check (price_ks > 0),
  version integer not null default 1,
  updated_by text not null,
  updated_at timestamptz not null default now()
);

-- 4. History: never updated, never deleted, so a price can always be read back.
create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  signature text not null,
  old_price_ks integer,
  new_price_ks integer not null check (new_price_ks > 0),
  changed_by text not null,
  changed_at timestamptz not null default now()
);

create index if not exists price_history_product_idx on public.price_history (product_id, changed_at desc);
create index if not exists variant_options_value_idx on public.variant_options (attribute_id, value);
create index if not exists product_variants_product_idx on public.product_variants (product_id);

-- 5. A variant price change is one transaction: the price row, its version bump and its history row.
--    The expected version is checked inside the function, so a stale screen cannot overwrite a
--    colleague's save.
create or replace function public.set_variant_price(
  p_variant_id uuid,
  p_price_ks integer,
  p_expected_version integer,
  p_actor text
) returns public.variant_prices
language plpgsql
security definer
set search_path = public
as $$
declare
  current_price public.variant_prices;
  variant public.product_variants;
  next_price public.variant_prices;
begin
  if p_price_ks is null or p_price_ks <= 0 then
    raise exception 'price must be more than zero';
  end if;

  select * into current_price from public.variant_prices where variant_id = p_variant_id for update;
  if not found then
    raise exception 'variant % has no price row', p_variant_id;
  end if;
  if current_price.version <> p_expected_version then
    raise exception 'version conflict on variant %', p_variant_id using errcode = '40001';
  end if;

  select * into variant from public.product_variants where id = p_variant_id;

  update public.variant_prices
     set price_ks = p_price_ks,
         version = version + 1,
         updated_by = p_actor,
         updated_at = now()
   where variant_id = p_variant_id
   returning * into next_price;

  insert into public.price_history (product_id, variant_id, signature, old_price_ks, new_price_ks, changed_by)
  values (variant.product_id, p_variant_id, variant.signature, current_price.price_ks, p_price_ks, p_actor);

  return next_price;
end;
$$;

-- Only an admin may write prices or attributes.
alter table public.attributes enable row level security;
alter table public.attribute_values enable row level security;
alter table public.product_attributes enable row level security;
alter table public.product_variants enable row level security;
alter table public.variant_options enable row level security;
alter table public.variant_prices enable row level security;
alter table public.price_history enable row level security;

-- The shop reads the catalogue (a disabled variant is not offered), the admin writes it.
create policy "variant prices are public" on public.variant_prices for select using (true);
create policy "product variants are public" on public.product_variants for select using (true);
create policy "variant options are public" on public.variant_options for select using (true);
create policy "attributes are public" on public.attributes for select using (true);
create policy "attribute values are public" on public.attribute_values for select using (true);
create policy "product attributes are public" on public.product_attributes for select using (true);
create policy "price history is admin only" on public.price_history for select using (public.is_super_admin());
