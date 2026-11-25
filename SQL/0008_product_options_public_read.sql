-- MH Fashion — Migration 0008: let the storefront read which attributes a post sells on
-- Run this in the Supabase SQL Editor after 0004_public_catalog_rls.sql
--
-- The product page shows exactly the option boxes the admin ticked for that post
-- (product_attribute_types) and the values the admin entered (attribute_values). 0004 granted public
-- read on attribute_types, attribute_values and product_attribute_pricing but missed the join table, so
-- a logged-out visitor could not learn which attributes apply to the product.

alter table public.product_attribute_types enable row level security;

drop policy if exists "Public read access" on public.product_attribute_types;
create policy "Public read access" on public.product_attribute_types
  for select using (true);

grant select on public.product_attribute_types to anon, authenticated;

-- Same for the cascade rules already granted in 0004; repeated here so this file can be run alone.
grant select on public.attribute_types to anon, authenticated;
grant select on public.attribute_values to anon, authenticated;

-- A product with no rows here is unconfigured: the storefront falls back to the shop's default boxes
-- (or, for a ready-made Nyein piece, to the size box alone). Ticking attributes in the dashboard
-- replaces that fallback with exactly what was ticked.
comment on table public.product_attribute_types is
  'Which attribute types a post sells on. The storefront renders one option box per row; no row means the attribute is not offered.';
