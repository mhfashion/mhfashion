# Guide content foundation

The guide catalog is intentionally ready for public reads before the future Post Admin module exists. The content model is split into `public.guide_categories` and `public.guide_posts`; posts store structured JSON sections rather than HTML.

## Apply the migration

The owner should run [`supabase/migrations/0005_guide_content.sql`](../supabase/migrations/0005_guide_content.sql) manually in the Supabase SQL Editor after migrations `0001` through `0004`. This task does not apply database changes. The migration is safe to re-run for its seed rows: category and post inserts use stable slugs with `ON CONFLICT (slug) DO NOTHING`, so existing owner edits are not overwritten.

The migration creates the tables, publication checks, timestamps, indexes, safe-section validation, and RLS. It grants `SELECT` only to `anon` and `authenticated`. Their policies expose a category or post only when it is `published` and its `published_at` is not in the future; a post also requires a published category. There are no public insert, update, delete, or truncate grants. Until admin authentication and the Post Admin module arrive, use the Supabase SQL Editor or a server-side service-role process for content management.

## Content shape

Each post's `sections` value is a JSON array of objects with this shape:

```json
[
  {
    "heading": "A plain-text heading",
    "paragraphs": ["A plain-text paragraph."],
    "bullets": ["An optional plain-text bullet."]
  }
]
```

Sections, paragraphs, and bullets are bounded and must contain plain text. The database validation rejects HTML-looking angle brackets, empty values, malformed arrays, and unexpected section keys. Keep content factual and grounded in `docs/PROJECT_PLAN.md`; in particular, describe payment, editor, and delivery behaviors as planned until those integrations are actually live. Do not add invented delivery SLAs, size measurements, payment amounts, or gateway details.

## Safely edit a draft

Use the SQL Editor with the exact slug and keep a draft unpublished while editing. Replace the JSON with a valid JSON array and cast it to `jsonb`:

```sql
update public.guide_posts
set
  title = 'Revised title',
  excerpt = 'A concise plain-text summary.',
  sections = '[
    {
      "heading": "A section heading",
      "paragraphs": ["A factual paragraph."],
      "bullets": ["An optional bullet."]
    }
  ]'::jsonb,
  seo_title = 'Revised SEO title',
  seo_description = 'A concise plain-text search description.',
  status = 'draft',
  published_at = null,
  updated_at = now()
where slug = 'the-planned-editor-flow';
```

Category names and descriptions can be edited in `public.guide_categories` by slug. Keep category and post slugs lowercase, hyphen-separated, and stable after a URL is public. The database constraints enforce the slug format and title/excerpt/SEO limits.

## Publish a draft

Review the text and JSON in the SQL Editor, then publish the category and its posts explicitly. A future `published_at` keeps the row hidden until that time; using `now()` publishes immediately:

```sql
update public.guide_categories
set status = 'published', published_at = now(), updated_at = now()
where slug = 'design-guide';

update public.guide_posts
set status = 'published', published_at = now(), updated_at = now()
where slug = 'the-planned-editor-flow';
```

Public reads never return drafts, posts scheduled for the future, or posts whose category is not currently published. To unpublish, set `status = 'draft'` and `published_at = null`.

## Runtime fallback behavior

`apps/web/src/lib/guides.ts` validates every live category, post, and JSON section before returning it. If Supabase environment variables are missing, or PostgREST reports that the guide tables are missing, the loader returns the starter catalog from `apps/web/src/lib/guide-starter.ts` with `source: 'starter'`. A successful live query with zero published rows stays `source: 'supabase'` and returns empty arrays; starter posts are not resurrected over an intentionally empty catalog. Other backend failures return `source: 'unavailable'` with empty arrays. Requests use a bounded fetch timeout and React request memoization without a cross-request stale cache.

Guide page metadata can optionally use `NEXT_PUBLIC_SITE_URL` from the web app environment to create absolute canonical and Open Graph URLs. Set it only to the public HTTPS origin, without a path, credentials, query string, or fragment. If it is absent, canonical and `og:url` tags are omitted rather than guessed; titles, descriptions, and other sharing metadata remain available.

## Future Post Admin

The admin workflow is deliberately not included here. The project plan assigns Guide posts, categories, SEO fields, and publish/draft controls to Post Admin, but no admin authentication or role module exists yet. A future module should use a privileged server-side path, preserve the same JSON contract and publication rules, and keep service-role credentials out of browser code.

## Validation commands

From the repository root, `npm run test:guide` runs the guide loader/search/metadata unit suite and `npx tsc -p apps/web/tsconfig.json --noEmit --incremental false` checks TypeScript. `npm run build` validates the Next.js production build. To run the HTTP suite, start the built web app on port 3000 and run `npm run test:guide:http`; these HTTP assertions intentionally expect the starter catalog, so use a local environment without Supabase variables, not a production content database. `GUIDE_TEST_ORIGIN` can override the local origin.

The migration was also tested in isolated embedded PostgreSQL: applying/rerunning it, matching all seed content, malformed section rejection, draft/future/category publication filtering, and denial of public writes. No production Supabase data was accessed or changed during validation. Managed editor diagnostics were unavailable because this GitHub-only task has no Manus web-project binding; the TypeScript compiler and production build supplied the source diagnostics instead.
