-- MH Fashion — Migration 0004: ensure public read access to catalog tables
-- Run this in the Supabase SQL Editor. Safe to run even if RLS wasn't the
-- issue — it just makes sure anon/public SELECT is explicitly allowed.

alter table public.products enable row level security;
alter table public.product_attribute_pricing enable row level security;
alter table public.attribute_types enable row level security;
alter table public.attribute_values enable row level security;
alter table public.attribute_cascade_rules enable row level security;

drop policy if exists "Public read access" on public.products;
create policy "Public read access" on public.products
  for select using (true);

drop policy if exists "Public read access" on public.product_attribute_pricing;
create policy "Public read access" on public.product_attribute_pricing
  for select using (true);

drop policy if exists "Public read access" on public.attribute_types;
create policy "Public read access" on public.attribute_types
  for select using (true);

drop policy if exists "Public read access" on public.attribute_values;
create policy "Public read access" on public.attribute_values
  for select using (true);

drop policy if exists "Public read access" on public.attribute_cascade_rules;
create policy "Public read access" on public.attribute_cascade_rules
  for select using (true);

-- Make sure the anon/authenticated roles actually have SELECT grants too
-- (RLS policies only take effect on rows a role already has table-level
-- access to).
grant select on public.products to anon, authenticated;
grant select on public.product_attribute_pricing to anon, authenticated;
grant select on public.product_price_ranges to anon, authenticated;
grant select on public.attribute_types to anon, authenticated;
grant select on public.attribute_values to anon, authenticated;
grant select on public.attribute_cascade_rules to anon, authenticated;
