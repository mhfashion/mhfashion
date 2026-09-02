-- MH Fashion — Migration 0003: seed demo products
-- Run this in the Supabase SQL Editor after 0002_catalog_fields.sql.
-- Replace with real catalog data later; this just gets the homepage showing
-- live Supabase-backed content instead of hardcoded placeholders.

insert into public.products (name, sub_brand, is_customizable, product_type, slug, is_new)
values
  ('Chaos Theory', 'MH Fashion', 'full', 'T-shirt', 'chaos-theory', true),
  ('Butterfly Effect', 'MH Fashion', 'full', 'T-shirt', 'butterfly-effect', false),
  ('Lost In Space', 'MH Fashion', 'full', 'T-shirt', 'lost-in-space', false),
  ('X Marks', 'MH Fashion', 'full', 'T-shirt', 'x-marks', false),
  ('Dreaming', 'MH Fashion', 'full', 'T-shirt', 'dreaming', false),
  ('Shadow Hunter', 'MH Fashion', 'full', 'T-shirt', 'shadow-hunter', false),
  ('Void Tee', 'MH Fashion', 'full', 'T-shirt', 'void-tee', false),
  ('Skull Case', 'Accessories', 'full', 'Phone Cover', 'skull-case', false),
  ('Tote Bag', 'Accessories', 'full', 'Bag', 'tote-bag', false),
  ('Mug 01', 'Accessories', 'full', 'Cup', 'mug-01', false),
  ('Hoodie X', 'Streetwear', 'full', 'Hoodie', 'hoodie-x', false),
  ('Cap Basic', 'Accessories', 'none', 'Cap', 'cap-basic', false)
on conflict (slug) do nothing;

-- Give each product a low and a high price row so product_price_ranges
-- (from migration 0002) has something to compute a min/max from.
insert into public.product_attribute_pricing (product_id, attribute_selection, price_ks)
select id, '{"variant": "base"}'::jsonb, v.price_min
from public.products p
join (values
  ('chaos-theory', 22000, 26000),
  ('butterfly-effect', 21000, 25000),
  ('lost-in-space', 24000, 28000),
  ('x-marks', 20000, 24000),
  ('dreaming', 23000, 27000),
  ('shadow-hunter', 22000, 26000),
  ('void-tee', 25000, 30000),
  ('skull-case', 8000, 8000),
  ('tote-bag', 12000, 12000),
  ('mug-01', 9000, 9000),
  ('hoodie-x', 35000, 40000),
  ('cap-basic', 14000, 14000)
) as v(slug, price_min, price_max) on v.slug = p.slug;

insert into public.product_attribute_pricing (product_id, attribute_selection, price_ks)
select id, '{"variant": "premium"}'::jsonb, v.price_max
from public.products p
join (values
  ('chaos-theory', 22000, 26000),
  ('butterfly-effect', 21000, 25000),
  ('lost-in-space', 24000, 28000),
  ('x-marks', 20000, 24000),
  ('dreaming', 23000, 27000),
  ('shadow-hunter', 22000, 26000),
  ('void-tee', 25000, 30000),
  ('skull-case', 8000, 8000),
  ('tote-bag', 12000, 12000),
  ('mug-01', 9000, 9000),
  ('hoodie-x', 35000, 40000),
  ('cap-basic', 14000, 14000)
) as v(slug, price_min, price_max) on v.slug = p.slug;
