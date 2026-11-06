-- MH Fashion — Migration 0006: optional blog post cover images
-- Cover images are optional so existing posts remain valid until media is added.

alter table public.guide_posts
  add column if not exists cover_image_url text;

alter table public.guide_posts
  drop constraint if exists guide_posts_cover_image_url_check;

alter table public.guide_posts
  add constraint guide_posts_cover_image_url_check check (
    cover_image_url is null
    or (
      char_length(cover_image_url) between 1 and 2048
      and cover_image_url ~ '^https?://'
    )
  );
