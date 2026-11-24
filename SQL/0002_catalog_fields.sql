-- MH Fashion — Migration 0002: catalog fields + price range view
-- Run this in the Supabase SQL Editor after 0001_initial_schema.sql

alter table public.products
  add column if not exists product_type text,   -- e.g. 'T-shirt', 'Hoodie', 'Cup', 'Phone Cover'
  add column if not exists slug text unique,
  add column if not exists image_url text,
  add column if not exists is_new boolean not null default false;

-- Convenience view: min/max price per product, computed from
-- product_attribute_pricing (every attribute combination's price row).
create or replace view public.product_price_ranges as
select
  product_id,
  min(price_ks) as price_min_ks,
  max(price_ks) as price_max_ks
from public.product_attribute_pricing
group by product_id;

-- Public catalog data should be readable by anyone (anon key), including
-- logged-out visitors browsing the store — no RLS restriction needed here.
