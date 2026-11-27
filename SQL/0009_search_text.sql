-- MH Fashion — Migration 0009: one normalised search text per record (Plan §17 S4)
-- Run this in the Supabase SQL Editor after 0008_product_options_public_read.sql.
--
-- Every searchable record carries `search_text`, built when the row is written. It holds the names in
-- English and in Myanmar, aliases, tags, brand and type, folded exactly the way the app folds a query
-- (`apps/web/src/lib/search-text.ts`): NFC, zero-width characters removed, spaces collapsed, lower case,
-- and each run of Myanmar signs after a consonant put into Unicode's storage order.
--
-- The column is what `ilike` and (step 3) the trigram index read, so the storefront never has to search
-- three columns in one `or()` again.

-- ============================================================
-- THE FOLD (keep in step with normalizeSearchText in the app)
-- ============================================================
create or replace function public.normalize_search_text(value text)
returns text
language plpgsql
immutable
as $$
declare
  folded text;
  out text := '';
  run_chars text[] := '{}';
  run_ranks integer[] := '{}';
  ch text;
  sign_rank integer;
  sorted text;
begin
  if value is null then
    return null;
  end if;

  -- U+200B..U+200D and U+FEFF are invisible in the text but split one word into two spellings.
  folded := lower(btrim(regexp_replace(
    regexp_replace(value, E'[\u200B\u200C\u200D\uFEFF]', '', 'g'),
    E'[\\s\u00A0]+', ' ', 'g'
  )));

  for i in 1..char_length(folded) loop
    ch := substr(folded, i, 1);
    sign_rank := case ch
      when E'\u103B' then 10  -- ျ medial ya
      when E'\u103C' then 11  -- ြ medial ra
      when E'\u103D' then 12  -- ွ medial wa
      when E'\u103E' then 13  -- ှ medial ha
      when E'\u1031' then 20  -- ေ e vowel
      when E'\u102D' then 21  -- ိ i
      when E'\u102E' then 22  -- ီ ii
      when E'\u102F' then 23  -- ု u
      when E'\u1030' then 24  -- ူ uu
      when E'\u1032' then 25  -- ဲ ai
      when E'\u1036' then 30  -- ံ anusvara
      when E'\u102B' then 31  -- ါ tall aa
      when E'\u102C' then 32  -- ာ aa
      when E'\u1037' then 40  -- ့ dot below
      when E'\u103A' then 45  -- ် asat, before the visarga: real Burmese text stores "င်း" as 103A then 1038
      when E'\u1038' then 50  -- း visarga
      else null
    end;

    if sign_rank is not null then
      -- U+1039 (virama) is absent on purpose: it joins the next consonant and must keep its place.
      run_chars := run_chars || ch;
      run_ranks := run_ranks || sign_rank;
    else
      if coalesce(array_length(run_chars, 1), 0) > 1 then
        select string_agg(letter, '' order by rank, position) into sorted
        from unnest(run_chars, run_ranks) with ordinality as run(letter, rank, position);
        out := out || sorted;
      elsif coalesce(array_length(run_chars, 1), 0) = 1 then
        out := out || run_chars[1];
      end if;
      run_chars := '{}';
      run_ranks := '{}';
      out := out || ch;
    end if;
  end loop;

  if coalesce(array_length(run_chars, 1), 0) > 1 then
    select string_agg(letter, '' order by rank, position) into sorted
    from unnest(run_chars, run_ranks) with ordinality as run(letter, rank, position);
    out := out || sorted;
  elsif coalesce(array_length(run_chars, 1), 0) = 1 then
    out := out || run_chars[1];
  end if;

  return out;
end;
$$;

-- ============================================================
-- PRODUCTS: the Myanmar name, aliases and tags the search reads
-- ============================================================
alter table public.products
  add column if not exists name_my text,
  add column if not exists aliases text[] not null default '{}',
  add column if not exists tags text[] not null default '{}',
  add column if not exists search_text text;

create or replace function public.product_search_text(p public.products)
returns text
language sql
immutable
as $$
  select public.normalize_search_text(concat_ws(' ',
    p.name,
    p.name_my,
    p.slug,
    p.sub_brand,
    p.product_type,
    array_to_string(p.tags, ' '),
    array_to_string(p.aliases, ' ')
  ));
$$;

create or replace function public.products_set_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.product_search_text(new);
  return new;
end;
$$;

drop trigger if exists products_set_search_text on public.products;
create trigger products_set_search_text
  before insert or update of name, name_my, slug, sub_brand, product_type, tags, aliases
  on public.products
  for each row execute function public.products_set_search_text();

-- ============================================================
-- GUIDE POSTS: title, excerpt, SEO text and every section
-- ============================================================
alter table public.guide_posts
  add column if not exists search_text text;

create or replace function public.guide_post_search_text(p public.guide_posts)
returns text
language sql
immutable
as $$
  select public.normalize_search_text(concat_ws(' ',
    p.title,
    p.excerpt,
    p.slug,
    p.seo_title,
    p.seo_description,
    (select string_agg(replace(value::text, '"', ''), ' ')
       from jsonb_path_query(p.sections, '$[*].heading') as value),
    (select string_agg(replace(value::text, '"', ''), ' ')
       from jsonb_path_query(p.sections, '$[*].paragraphs[*]') as value),
    (select string_agg(replace(value::text, '"', ''), ' ')
       from jsonb_path_query(p.sections, '$[*].bullets[*]') as value)
  ));
$$;

create or replace function public.guide_posts_set_search_text()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.guide_post_search_text(new);
  return new;
end;
$$;

drop trigger if exists guide_posts_set_search_text on public.guide_posts;
create trigger guide_posts_set_search_text
  before insert or update of title, excerpt, slug, seo_title, seo_description, sections
  on public.guide_posts
  for each row execute function public.guide_posts_set_search_text();

-- ============================================================
-- BACKFILL the rows that already exist
-- ============================================================
update public.products set search_text = public.product_search_text(products)
where search_text is distinct from public.product_search_text(products);

update public.guide_posts set search_text = public.guide_post_search_text(guide_posts)
where search_text is distinct from public.guide_post_search_text(guide_posts);

-- ============================================================
-- INDEXES: the substring search reads `search_text` alone. The trigram index that makes `%term%`
-- fast arrives in step 3 with the pg_trgm extension; a btree prefix index covers the common
-- "starts with" case in the meantime.
-- ============================================================
create index if not exists products_search_text_idx on public.products (search_text text_pattern_ops);
create index if not exists guide_posts_search_text_idx on public.guide_posts (search_text text_pattern_ops);
