-- MH Fashion — Migration 0011: count the searches that found nothing (Plan §17 S8)
-- Run this in the Supabase SQL Editor after 0010_search_trigram.sql.
--
-- A miss is worth knowing about: it is the only signal that says what the shop does not sell, or which
-- spelling the customers use. The row holds the folded term and a count — no user id, no address, no
-- order — and it is dropped after 90 days, so the table stays small and says nothing about a person.

create table if not exists public.search_misses (
  term text primary key,
  hits integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

comment on table public.search_misses is
  'Storefront searches that returned nothing: the folded term, its count and the last time it was typed. Kept 90 days.';

alter table public.search_misses enable row level security;

create index if not exists search_misses_last_seen_idx on public.search_misses (last_seen desc);

-- The storefront calls this when a search finds nothing. `security definer` because the anon role may not
-- write the table, and the function refuses anything that is not a plausible query.
create or replace function public.record_search_miss(p_term text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  folded text := public.normalize_search_text(p_term);
begin
  if folded is null or char_length(folded) < 2 or char_length(folded) > 60 then
    return;
  end if;
  insert into public.search_misses (term) values (folded)
  on conflict (term) do update
    set hits = public.search_misses.hits + 1,
        last_seen = now();
  delete from public.search_misses where last_seen < now() - interval '90 days';
end;
$$;

grant execute on function public.record_search_miss(text) to anon, authenticated;

-- The admin panel reads the week's misses. It is not granted to anon: a visitor must not be able to read
-- the shop's search log. The API route calls it with the service-role key.
create or replace function public.top_search_misses(p_days integer default 7, p_limit integer default 10)
returns table (term text, hits integer, last_seen timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.term, m.hits, m.last_seen
  from public.search_misses m
  where m.last_seen >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
  order by m.hits desc, m.last_seen desc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

revoke all on function public.top_search_misses(integer, integer) from public, anon, authenticated;
grant execute on function public.top_search_misses(integer, integer) to service_role;
