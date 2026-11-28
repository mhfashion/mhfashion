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

-- 3. The prices itself: one live row per variant, versioned for optimistic concurrency. Both
--    currencies are typed by the admin — nothing here converts one into the other — and a variant is
--    sellable only when both are set.
create table if not exists public.variant_prices (
  variant_id uuid primary key references public.product_variants (id) on delete cascade,
  price_ks integer check (price_ks > 0),
  price_usd numeric(10, 2) check (price_usd > 0),
  -- Available | Out of Stock | Temporarily Unavailable | Disabled. Kept apart from `enabled`:
  -- an active variant can be out of stock.
  availability text not null default 'Available'
    check (availability in ('Available', 'Out of Stock', 'Temporarily Unavailable', 'Disabled')),
  stock_quantity integer,
  low_stock_threshold integer,
  restock_quantity integer,
  stock_tracking boolean not null default false,
  sku text,
  note text,
  disable_reason text,
  version integer not null default 1,
  updated_by text not null,
  updated_at timestamptz not null default now()
);

-- A product can stop selling as a whole, and one option (a colour) can stop on its own.
create table if not exists public.product_availability (
  product_id uuid primary key references public.products (id) on delete cascade,
  availability text not null default 'Available'
    check (availability in ('Available', 'Out of Stock', 'Temporarily Unavailable', 'Disabled')),
  updated_at timestamptz not null default now()
);

create table if not exists public.option_availability (
  product_id uuid not null references public.products (id) on delete cascade,
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  value text not null,
  availability text not null default 'Available'
    check (availability in ('Available', 'Out of Stock', 'Temporarily Unavailable', 'Disabled')),
  primary key (product_id, attribute_id, value)
);

-- 4. History: never updated, never deleted, so a price can always be read back.
create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  signature text not null,
  old_price_ks integer,
  new_price_ks integer check (new_price_ks > 0),
  old_price_usd numeric(10, 2),
  new_price_usd numeric(10, 2),
  old_availability text,
  new_availability text,
  note text,
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
  p_price_usd numeric,
  p_availability text,
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
  if p_price_ks is null and p_price_usd is null then
    raise exception 'a variant needs at least one price';
  end if;
  if p_price_ks is not null and p_price_ks <= 0 then
    raise exception 'MMK price must be more than zero';
  end if;
  if p_price_usd is not null and p_price_usd <= 0 then
    raise exception 'USD price must be more than zero';
  end if;
  if p_availability is not null
     and p_availability not in ('Available', 'Out of Stock', 'Temporarily Unavailable', 'Disabled') then
    raise exception 'unknown availability %', p_availability;
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
     set price_ks = coalesce(p_price_ks, price_ks),
         price_usd = coalesce(p_price_usd, price_usd),
         availability = coalesce(p_availability, availability),
         version = version + 1,
         updated_by = p_actor,
         updated_at = now()
   where variant_id = p_variant_id
   returning * into next_price;

  insert into public.price_history (
    product_id, variant_id, signature, old_price_ks, new_price_ks,
    old_price_usd, new_price_usd, old_availability, new_availability, changed_by
  ) values (
    variant.product_id, p_variant_id, variant.signature, current_price.price_ks, next_price.price_ks,
    current_price.price_usd, next_price.price_usd, current_price.availability, next_price.availability, p_actor
  );

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

-- 6. What the shop may show: both currencies set, Active, and the customer-facing state Available.
create or replace view public.sellable_variants as
select
  v.id as variant_id,
  v.product_id,
  v.signature,
  p.price_ks,
  p.price_usd
from public.product_variants v
join public.variant_prices p on p.variant_id = v.id
join public.product_availability pa on pa.product_id = v.product_id
where v.enabled
  and p.price_ks is not null
  and p.price_usd is not null
  and p.availability = 'Available'
  and pa.availability = 'Available'
  and not exists (
    select 1
    from public.variant_options o
    join public.option_availability oa
      on oa.product_id = v.product_id
     and oa.attribute_id = o.attribute_id
     and oa.value = o.value
    where o.variant_id = v.id
      and oa.availability <> 'Available'
  );
