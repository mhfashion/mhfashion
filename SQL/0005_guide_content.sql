-- MH Fashion — Migration 0005: public guide content foundation
-- Run this in the Supabase SQL Editor after 0004_public_catalog_rls.sql.
-- Post Admin writes are intentionally deferred: anon/authenticated can only
-- read currently published content; the owner/service role manages rows until
-- the future admin module exists.

create table if not exists public.guide_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guide_categories_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint guide_categories_slug_length check (char_length(slug) between 1 and 96),
  constraint guide_categories_name_length check (char_length(btrim(name)) between 2 and 120),
  constraint guide_categories_description_length check (
    char_length(btrim(description)) between 1 and 320
  ),
  constraint guide_categories_publish_date check (
    status = 'draft' or published_at is not null
  )
);

create or replace function public.is_safe_guide_text(value text, maximum_length integer)
returns boolean
language sql
immutable
as $$
  select value is not null
    and char_length(value) between 1 and maximum_length
    and btrim(value) <> ''
    and position('<' in value) = 0
    and position('>' in value) = 0;
$$;

create or replace function public.is_valid_guide_sections(payload jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  section jsonb;
  paragraph jsonb;
  bullet jsonb;
begin
  if payload is null
     or jsonb_typeof(payload) <> 'array'
     or jsonb_array_length(payload) not between 1 and 12 then
    return false;
  end if;

  for section in select value from jsonb_array_elements(payload) loop
    if jsonb_typeof(section) <> 'object'
       or not (section ? 'heading')
       or not (section ? 'paragraphs')
       or (section - 'heading' - 'paragraphs' - 'bullets') <> '{}'::jsonb
       or jsonb_typeof(section->'heading') <> 'string'
       or not public.is_safe_guide_text(section->>'heading', 180)
       or jsonb_typeof(section->'paragraphs') <> 'array'
       or jsonb_array_length(section->'paragraphs') not between 1 and 12 then
      return false;
    end if;

    for paragraph in select value from jsonb_array_elements(section->'paragraphs') loop
      if jsonb_typeof(paragraph) <> 'string'
         or not public.is_safe_guide_text(paragraph #>> '{}', 2000) then
        return false;
      end if;
    end loop;

    if section ? 'bullets' then
      if jsonb_typeof(section->'bullets') <> 'array'
         or jsonb_array_length(section->'bullets') not between 1 and 16 then
        return false;
      end if;

      for bullet in select value from jsonb_array_elements(section->'bullets') loop
        if jsonb_typeof(bullet) <> 'string'
           or not public.is_safe_guide_text(bullet #>> '{}', 500) then
          return false;
        end if;
      end loop;
    end if;
  end loop;

  return true;
end;
$$;

create table if not exists public.guide_posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.guide_categories(id) on delete restrict,
  slug text not null unique,
  title text not null,
  excerpt text not null,
  sections jsonb not null,
  reading_minutes integer not null default 1,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guide_posts_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint guide_posts_slug_length check (char_length(slug) between 1 and 160),
  constraint guide_posts_title_length check (char_length(btrim(title)) between 3 and 180),
  constraint guide_posts_excerpt_length check (char_length(btrim(excerpt)) between 1 and 500),
  constraint guide_posts_sections_shape check (public.is_valid_guide_sections(sections)),
  constraint guide_posts_reading_minutes check (reading_minutes between 1 and 60),
  constraint guide_posts_seo_title_length check (
    seo_title is null or char_length(btrim(seo_title)) between 1 and 180
  ),
  constraint guide_posts_seo_description_length check (
    seo_description is null or char_length(btrim(seo_description)) between 1 and 320
  ),
  constraint guide_posts_publish_date check (
    status = 'draft' or published_at is not null
  )
);

create or replace function public.touch_guide_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guide_categories_set_updated_at on public.guide_categories;
create trigger guide_categories_set_updated_at
before update on public.guide_categories
for each row execute function public.touch_guide_updated_at();

drop trigger if exists guide_posts_set_updated_at on public.guide_posts;
create trigger guide_posts_set_updated_at
before update on public.guide_posts
for each row execute function public.touch_guide_updated_at();

create index if not exists guide_categories_publication_idx
  on public.guide_categories (status, published_at, slug);
create index if not exists guide_posts_publication_idx
  on public.guide_posts (status, published_at, category_id, featured);
create index if not exists guide_posts_category_idx
  on public.guide_posts (category_id, published_at, slug);

alter table public.guide_categories enable row level security;
alter table public.guide_posts enable row level security;

drop policy if exists "Public can read published guide categories" on public.guide_categories;
create policy "Public can read published guide categories"
  on public.guide_categories
  for select
  to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

drop policy if exists "Public can read published guide posts" on public.guide_posts;
create policy "Public can read published guide posts"
  on public.guide_posts
  for select
  to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
    and exists (
      select 1
      from public.guide_categories category
      where category.id = public.guide_posts.category_id
        and category.status = 'published'
        and category.published_at is not null
        and category.published_at <= now()
    )
  );

-- RLS does not grant table privileges. Public roles receive SELECT only;
-- public writes remain unavailable until a future Post Admin role/module exists.
revoke all on table public.guide_categories from anon, authenticated;
revoke all on table public.guide_posts from anon, authenticated;
grant select on table public.guide_categories to anon, authenticated;
grant select on table public.guide_posts to anon, authenticated;

-- Stable seed IDs make the TypeScript starter catalog and SQL seed content
-- interchangeable. ON CONFLICT DO NOTHING avoids clobbering owner edits when
-- this migration text is safely re-run in the SQL Editor.
insert into public.guide_categories
  (id, slug, name, description, status, published_at)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'product-guide',
    'Product Guide',
    'Learn how MH Fashion products, attributes, customization levels, and pricing choices fit together.',
    'published',
    '2026-01-01T00:00:00.000Z'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'design-guide',
    'Design Guide',
    'Learn the planned editor, preview, mockup, and design workflow.',
    'published',
    '2026-01-01T00:00:00.000Z'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'payment-guide',
    'Payment Guide',
    'Understand the planned checkout choices and payment-provider flow.',
    'published',
    '2026-01-01T00:00:00.000Z'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'delivery-guide',
    'Delivery Guide',
    'Understand the planned delivery providers, fees, and order statuses.',
    'published',
    '2026-01-01T00:00:00.000Z'
  )
on conflict (slug) do nothing;

insert into public.guide_posts
  (
    id,
    category_id,
    slug,
    title,
    excerpt,
    sections,
    reading_minutes,
    featured,
    status,
    published_at,
    seo_title,
    seo_description
  )
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'how-mh-fashion-products-are-organized',
    'How MH Fashion products are organized',
    'The product catalog is built around product, style, and color, with customization rules that vary by item.',
    $guide$[
      {
        "heading": "Start with the product",
        "paragraphs": [
          "MH Fashion plans to offer customizable and fixed-design products. The top-level selector is Product, with examples such as T-shirt, Streetwear, Hoodie, Cup, and Phone Cover."
        ],
        "bullets": [
          "Full customization lets the user edit the design.",
          "No customization keeps the design fixed.",
          "Partial customization uses a locked base template with selected overlay fields editable."
        ]
      },
      {
        "heading": "Pricing follows the selection",
        "paragraphs": [
          "Price depends on the full attribute combination rather than a flat product price. A Super Admin sets prices in the Pricing Management module, so a product card can show a range and the detail page can show the exact price after the full combination is chosen."
        ]
      }
    ]$guide$::jsonb,
    2,
    true,
    'published',
    '2026-01-01T00:00:00.000Z',
    'MH Fashion product and customization guide',
    'Understand MH Fashion product types, customization levels, attribute choices, and how planned pricing is determined.'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'how-apparel-options-narrow-down',
    'How apparel options narrow down',
    'The apparel selector uses cascading attributes so each choice keeps the later options relevant.',
    $guide$[
      {
        "heading": "Follow the selection chain",
        "paragraphs": [
          "For T-shirts, Hoodies, and Streetwear, the planned selection chain is Product → Print Method → Fabric Type → Knit/Fabric Structure → GSM → Color → MH Cuttings → Size."
        ],
        "bullets": [
          "Print Method includes DTF and Sublimation.",
          "Fabric Type includes Combed Cotton, Compact Combed Cotton, and Polyester.",
          "Knit/Fabric Structure includes Single Jersey, Interlock, and Air Layer.",
          "GSM is an admin-managed preset list."
        ]
      },
      {
        "heading": "Cascading keeps choices relevant",
        "paragraphs": [
          "Earlier choices filter every later attribute. For example, Sublimation can narrow Fabric Type to Polyester and narrow Knit Structure and GSM options too. Unavailable options are hidden, not greyed out. Color, Cutting, and Size are not filtered.",
          "The planned size guide shows weight and height ranges for adult sizes and age ranges for kids sizes; the plan does not prescribe specific measurements here."
        ]
      }
    ]$guide$::jsonb,
    2,
    false,
    'published',
    '2026-01-01T00:00:00.000Z',
    'MH Fashion apparel options and attribute guide',
    'See how print method, fabric, knit structure, GSM, color, cutting, and size choices are planned to work together.'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    'the-planned-editor-flow',
    'The planned editor flow',
    'The planned create flow gives designers separate Front and Back canvases, tools, layers, and a final mockup check.',
    $guide$[
      {
        "heading": "Build on two canvases",
        "paragraphs": [
          "The planned /create editor places Upload, Elements, Text, Effects, and AI in a left rail, with a tools palette below it and a layers panel on the right. Front and Back canvases sit side by side on a transparent background, with the attribute bar along the bottom."
        ]
      },
      {
        "heading": "Finish before ordering",
        "paragraphs": [
          "The top bar is planned to include Undo, Redo, live price, Save, Add to Cart, and Buy Now. Add to Cart and Buy Now stay disabled until the mockup is attached, and Save is intended to happen after the full flow completes.",
          "These are planned product behaviors from the project plan, not a claim that every editor feature or integration is live today. Terms acceptance and a watermark are also part of the planned first-use flow."
        ]
      }
    ]$guide$::jsonb,
    2,
    true,
    'published',
    '2026-01-01T00:00:00.000Z',
    'MH Fashion custom design editor guide',
    'Learn the planned MH Fashion editor layout, Front and Back canvases, design tools, layers, and mockup check.'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    'how-previews-and-mockups-are-planned',
    'How previews and mockups are planned',
    'The preview plan combines a product mockup with a design overlay while keeping Front and Back artwork separate.',
    $guide$[
      {
        "heading": "Three layers make the preview",
        "paragraphs": [
          "A planned preview has three layers: background, product mockup, and design SVG overlay. Grayscale recolor uses one base image per style and angle, so choosing a color can update the main image without requiring a separate photo for every color."
        ],
        "bullets": [
          "Front artwork appears only on the Front mockup.",
          "Back artwork appears only on the Back mockup.",
          "Detail shots show fabric close-ups without a design overlay."
        ]
      },
      {
        "heading": "Attach the design to the product",
        "paragraphs": [
          "Mockup attach is planned to copy Front placement proportionally to Back only when the print-area types match. Original admin SVGs remain immutable; Edit Design creates the user's own copy.",
          "The preview and attachment rules describe the intended product behavior and may evolve as implementation continues."
        ]
      }
    ]$guide$::jsonb,
    2,
    false,
    'published',
    '2026-01-01T00:00:00.000Z',
    'MH Fashion preview and mockup guide',
    'Understand the planned MH Fashion preview layers, recolor approach, Front and Back artwork, and mockup attachment rules.'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000003',
    'payment-options-at-checkout',
    'Payment options at checkout',
    'The planned checkout supports card and Myanmar payment choices through a Payment Provider interface.',
    $guide$[
      {
        "heading": "Planned provider choices",
        "paragraphs": [
          "The commerce plan lists Visa, KBZPay, Wave Pay, and AYA Pay behind a Payment Provider interface. Cash on delivery is not part of the plan, and payment must complete before an order confirms."
        ],
        "bullets": [
          "Checkout is planned to auto-detect the provider.",
          "The user chooses a payment option before confirming the order.",
          "An order remains in Pending Payment until payment is complete."
        ]
      },
      {
        "heading": "What checkout summarizes",
        "paragraphs": [
          "The planned checkout includes an address from the account, provider detection, payment choice, order summary, and terms. Gateway API details remain deferred, so this article explains the intended workflow rather than claiming that a payment integration is live."
        ]
      }
    ]$guide$::jsonb,
    2,
    true,
    'published',
    '2026-01-01T00:00:00.000Z',
    'MH Fashion payment and checkout guide',
    'Understand the planned Visa and Myanmar payment choices, provider interface, and payment-first checkout workflow.'
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000003',
    'what-payment-means-for-order-status',
    'What payment means for order status',
    'Payment is planned as the first gate in MH Fashion''s order workflow, before confirmation and production stages.',
    $guide$[
      {
        "heading": "Payment comes first",
        "paragraphs": [
          "The planned order workflow starts at Pending Payment. After payment completes, an order can move to Confirmed and then through Processing, Printing, Ready to Ship, Handed to Delivery, Out for Delivery, and Delivered."
        ],
        "bullets": [
          "Cancelled and Refunded are additional planned outcomes.",
          "Payment must complete before the order confirms.",
          "The status names belong to MH Fashion's own workflow."
        ]
      },
      {
        "heading": "A plan, not a live promise",
        "paragraphs": [
          "Provider behavior and gateway API details are still deferred in the project plan. Use the live checkout and order status shown by MH Fashion when those flows are available; this guide does not promise a particular processing time."
        ]
      }
    ]$guide$::jsonb,
    2,
    false,
    'published',
    '2026-01-01T00:00:00.000Z',
    'MH Fashion payment and order status guide',
    'See how the planned payment-first flow connects to MH Fashion order confirmation and production statuses.'
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000004',
    'how-delivery-fees-are-planned',
    'How delivery fees are planned',
    'The delivery plan separates domestic and international providers while keeping the customer payment with MH Fashion.',
    $guide$[
      {
        "heading": "Two planned delivery providers",
        "paragraphs": [
          "The commerce plan lists MH Delivery for domestic delivery and DHL for international delivery. Both sit behind a Delivery Provider interface, so the provider choice can be adjusted as the platform develops."
        ]
      },
      {
        "heading": "Fee and settlement flow",
        "paragraphs": [
          "The delivery fee is planned to be calculated from the moment an item is added to the cart and combined with the product total. The user pays MH Fashion, and MH Fashion settles with the courier separately through a Delivery Settlement Report in admin.",
          "The plan does not define a delivery-time SLA or fixed shipping amount. Live availability and quotes should come from the checkout flow when delivery integration is available."
        ]
      }
    ]$guide$::jsonb,
    2,
    true,
    'published',
    '2026-01-01T00:00:00.000Z',
    'MH Fashion delivery fee and provider guide',
    'Understand the planned MH Delivery and DHL provider flow, delivery fee timing, and courier settlement model.'
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000004',
    'order-status-and-delivery-handoff',
    'Order status and delivery handoff',
    'The planned status timeline shows when an order moves from production into delivery and final handoff.',
    $guide$[
      {
        "heading": "Follow the planned timeline",
        "paragraphs": [
          "After payment and confirmation, the planned MH Fashion workflow moves through production and delivery stages in this order:"
        ],
        "bullets": [
          "Pending Payment → Confirmed → Processing → Printing",
          "Ready to Ship → Handed to Delivery → Out for Delivery → Delivered",
          "Cancelled and Refunded are separate planned outcomes."
        ]
      },
      {
        "heading": "What the labels do not promise",
        "paragraphs": [
          "Handed to Delivery, Out for Delivery, and Delivered are planned status labels, not a delivery-time guarantee. Stages may be adjusted later, and this guide does not invent a shipping SLA."
        ]
      }
    ]$guide$::jsonb,
    2,
    false,
    'published',
    '2026-01-01T00:00:00.000Z',
    'MH Fashion order status and delivery guide',
    'Read the planned MH Fashion order timeline from payment through production, delivery handoff, and delivery completion.'
  )
on conflict (slug) do nothing;
