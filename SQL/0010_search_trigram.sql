-- MH Fashion — Migration 0010: a misspelled query still finds its record (Plan §17 S3)
-- Run this in the Supabase SQL Editor after 0009_search_text.sql.
--
-- Postgres full-text search (`tsvector`) has no usable Burmese configuration, so the typo tolerance is
-- trigram similarity: `pg_trgm` indexes the folded `search_text`, and a query that found nothing falls back
-- to `search_products_fuzzy`, which keeps every row above the similarity threshold (0.3 by default).
-- The app ranks whatever comes back with the same rules as an exact search, so a real match still wins.

create extension if not exists pg_trgm;

create index if not exists products_search_text_trgm_idx
  on public.products using gin (search_text gin_trgm_ops);

create index if not exists guide_posts_search_text_trgm_idx
  on public.guide_posts using gin (search_text gin_trgm_ops);

-- `search_products_fuzzy` is the fallback the app calls when the exact search found nothing. It compares the
-- term with the best matching *word* of `search_text` (`word_similarity`, `<%`), not with the whole column:
-- `similarity()` against a long column dilutes the score until a real typo ("buterfly") reads as 0.16.
-- The threshold is lowered to 0.4 for the call so a heavier typo still lands; `<%` is what lets the trigram
-- index answer instead of a sequential scan.
create or replace function public.search_products_fuzzy(p_term text, p_limit integer default 40)
returns setof public.products
language sql
stable
set pg_trgm.word_similarity_threshold = 0.4
as $$
  with folded as (
    select public.normalize_search_text(p_term) as term
  )
  select p.*
  from public.products p, folded
  where p.search_text is not null
    and folded.term is not null
    and char_length(folded.term) >= 3
    and folded.term <% p.search_text
  order by word_similarity(folded.term, p.search_text) desc, p.name
  limit greatest(1, least(coalesce(p_limit, 40), 80));
$$;

-- The storefront reads the catalog with the anon key.
grant execute on function public.search_products_fuzzy(text, integer) to anon, authenticated;
