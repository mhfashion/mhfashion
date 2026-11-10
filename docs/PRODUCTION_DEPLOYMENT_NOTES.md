# Production Upgrade and Publishing Notes

## Security reference material

- Fabric.js 7 migration guide: https://fabricjs.com/docs/upgrading/upgrading-to-fabric-70/
- Fabric.js stored-SVG XSS advisory: https://github.com/advisories/GHSA-hfvx-25r5-qc3w
- Fabric.js gradient SVG serialization advisory: https://github.com/advisories/GHSA-w22m-hvvm-xmwx
- Next.js 16 upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-16
- Next.js security release reference: https://nextjs.org/blog/november-2026-security-release
- OpenNext Cloudflare deployment guide: https://opennext.js.org/cloudflare

Fabric.js 7 changes object-origin defaults and removes legacy Canvas pointer/dimension methods. The project upgrade targets Fabric.js 7.4.0, which includes the cited SVG serialization fixes; app pointer reads now use `getScenePoint`, transient overlays keep their intended left/top positioning, and middle-click handling is explicit. Next.js 16.4.6 and React/React DOM 19.3.1 build successfully with the updated app type configuration.

## Verified upgrade and regression results (2026-11-11)

- `npm audit --workspace=apps/web --omit=dev --audit-level=moderate` reports zero production vulnerabilities. The complete tree still reports 4 high and 10 moderate build/lint-tool findings; no forced major downgrade was applied.
- `npm run test:guide` passed 9/9. `npm run test:guide:http` passed 5/5 against the production Next server, including SSR, search, 404 behavior, and the synchronized route manifest (`/cart` included, closed `/admin/register` excluded).
- Next.js production build and standalone TypeScript check passed. OpenNext Cloudflare build and Wrangler dry-run passed; Worker upload size was about 1.21 MiB gzip. Wrangler reports the existing `compatibility_date` of 2025-04-01 is old and emits non-fatal duplicate-key warnings in generated Fabric/OpenNext output; review these separately rather than making an untested compatibility-date change.
- Browser testing added a vector SVG element and created a rectangle with the Shape tool, verified object count 1 → 2, Undo 2 → 1 and Redo 1 → 2, confirmed Save, then cleared the disposable test canvas. No Fabric runtime errors were reported.

## Publishing state

The current project plan records the production site as `https://mhfashion.mhfashionmm.workers.dev`; an unauthenticated `curl` request from this sandbox returned HTTP 200. The security upgrade is not yet deployed. Latest remote `main` contains no deploy workflow, so `.github/workflows/deploy-cloudflare.yml` is restored on `chore/secure-fabric7-next16`. It is designed to trigger on web/lockfile changes to `main` or manual dispatch and runs production audit, unit/HTTP regressions, typecheck, Next/OpenNext builds, Wrangler dry-run, then deployment. Cloudflare secret presence is checked without printing values; actual token and account ID are provided only to the main-branch deploy step.

The owner reports that `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` were added as GitHub Secrets. `gh secret list` returns HTTP 403 for this CLI, so secret metadata was not independently inspected; the workflow's own safe preflight must confirm availability after push.

Latest `main` also closes public `/admin/register` and adds `supabase/migrations/0007_create_super_admin_roles.sql`. The upgrade preserves that change and does not apply the migration. The admin dashboard still uses its browser-local demo session, not Supabase Auth or server-side authorization. Supabase catalog credentials and migrations/seeds also remain unconfigured in this task, so real product listings are not yet guaranteed.
