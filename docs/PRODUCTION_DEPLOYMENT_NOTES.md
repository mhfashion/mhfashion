# Production Upgrade and Publishing Notes

## Security reference material

- Fabric.js 7 migration guide: https://fabricjs.com/docs/upgrading/upgrading-to-fabric-70/
- Fabric.js stored-SVG XSS advisory: https://github.com/advisories/GHSA-hfvx-25r5-qc3w
- Fabric.js gradient SVG serialization advisory: https://github.com/advisories/GHSA-w22m-hvvm-xmwx
- Next.js 16 upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-16
- Next.js security release reference: https://nextjs.org/blog/november-2026-security-release
- OpenNext Cloudflare deployment guide: https://opennext.js.org/cloudflare

Fabric.js 7 changes object-origin defaults and removes legacy Canvas pointer/dimension methods. The project upgrade uses Fabric.js 7.4.0, which includes the cited SVG serialization fixes; app pointer reads use `getScenePoint`, transient overlays preserve their intended `left`/`top` positioning, and middle-click handling is explicit. Next.js 16.4.6 and React/React DOM 19.3.1 build with the updated app type configuration.

## Verified upgrade and regression results (2026-11-11)

- `npm audit --workspace=apps/web --omit=dev --audit-level=moderate` reports zero production vulnerabilities. The complete dependency tree still reports 4 high and 10 moderate build/lint-tool findings; no forced major downgrade was applied.
- `npm run test:guide` passed 9/9. `npm run test:guide:http` passed 5/5 against the production Next server, including SSR, search, 404 behavior, and the synchronized route manifest (`/cart` included, closed `/admin/register` excluded).
- Clean Next.js production build and standalone TypeScript check passed. OpenNext Cloudflare build and Wrangler dry-run passed; Worker bundle was 5,901.89 KiB (1,237.12 KiB gzip). Wrangler reports the configured `compatibility_date` of 2025-04-01 is old and emits non-fatal duplicate-key warnings in generated Fabric/OpenNext output; these remain separate follow-up items.
- Browser regression added a vector SVG element and created a rectangle with the Shape tool, verified object count 1 → 2, Undo 2 → 1 and Redo 1 → 2, confirmed Save, then cleared the disposable test canvas. No Fabric runtime errors were reported.

## Publishing state (updated 2026-11-12)

The existing production site is `https://mhfashion.mhfashionmm.workers.dev`; a `curl` request from this sandbox returned HTTP 200. Commit `9cb5e21` was pushed to `main` with the security upgrade and `.github/workflows/deploy-cloudflare.yml`.

The push-triggered GitHub Actions run and its rerun both stopped in **Check required Cloudflare secrets**. GitHub Actions evaluated both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as missing (`false`). Therefore Actions did not run its CI/build steps and did not deploy this upgrade. The current production site remains the pre-upgrade version.

Add both values as **repository-level Actions secrets** at `mhfashion/mhfashion` → **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**. The names must match exactly: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Do not send either value in chat. If they were created as Environment secrets instead, tell us the GitHub Environment name so the workflow can reference it. `gh secret list` is unavailable to the current CLI due GitHub API HTTP 403, but the workflow's own safe check verified that Actions cannot currently see these values. Once configured at a scope visible to this workflow, rerun the existing workflow; deploy credentials are passed only to the final main-branch deploy step.

## Current-main application boundary

Latest `main` closes public `/admin/register` and includes `supabase/migrations/0007_create_super_admin_roles.sql`. The upgrade preserves that change and does not apply the migration. The admin dashboard still uses its browser-local demo session, not Supabase Auth or server-side authorization. Supabase catalog credentials and migrations/seeds remain unverified, so real product listings are not guaranteed by this upgrade.
