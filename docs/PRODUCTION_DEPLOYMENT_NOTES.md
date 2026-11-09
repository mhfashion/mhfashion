# Production Deployment Notes

Updated 2026-11-10 while preparing the GitHub push and Cloudflare deployment.

## Current target and verified build

The repository targets a Cloudflare Worker defined in `apps/web/wrangler.jsonc`. A clean `npm ci` installed the root lockfile's Next.js 15.5.29 and OpenNext Cloudflare 1.20.16. `npm run cf:build --workspace=apps/web` passed. `npx wrangler deploy --dry-run` passed with a 1.16 MiB compressed Worker bundle. The local Cloudflare Worker preview returned HTTP 200 for `/`, `/admin/login`, `/admin/register`, `/admin`, and `/manus-routes.json`.

The previous local OpenNext failure used a stale sandbox dependency (`next@15.5.25`) rather than the version pinned in the lockfile. Reinstalling with `npm ci` resolved that mismatch.

## Remaining production requirements

This environment has no Cloudflare API token/account ID, and `wrangler whoami` reports that Wrangler is not authenticated. The latest recorded GitHub deployment run, [run 42306302512](https://github.com/mhfashion/mhfashion/actions/runs/42306302512), failed at its required-secret check before build/deploy. The historical workflow at commit `4c7738f4f9159a8b3c676f33df31d96c06af8232` required repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. No deployment workflow is present on current `main`, so either restore a GitHub deploy workflow or configure Cloudflare Workers Builds before publication.

The current runtime has no `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Product queries now return an empty result rather than throwing when those settings are missing, allowing the storefront shell to render its existing “Products will appear here soon” state. Real catalog data still requires those public Supabase settings and the project's migrations/seed data.

`npm audit --workspace=apps/web --omit=dev` currently reports 8 production dependency advisories, including a high-severity Fabric.js SVG-export XSS advisory and a critical transitive `tar` advisory. `npm audit fix --dry-run` proposes breaking upgrades, including Fabric.js 6 to 7.4.0 and Next.js to 16.4.6. Do not force those changes without regression-testing the Fabric.js editor; resolve these findings before serving public production traffic.

## Compatibility references

Next.js lists 16.x as Active LTS and 15.x as Maintenance LTS, with Next.js 15 security releases extended through 2027-01-31: [Next.js Support Policy](https://nextjs.org/support-policy). Its November 2026 security release identifies Next.js 15.5.29 and 16.4.5 as patched releases: [November 2026 Security Release](https://nextjs.org/blog/november-2026-security-release).

The OpenNext Cloudflare adapter supports all Next.js 16 minor/patch versions and the latest minors of Next.js 14/15: [OpenNext Cloudflare compatibility](https://opennext.js.org/cloudflare). Cloudflare recommends vinext for new Next.js projects but says to use the OpenNext guide to maintain an existing OpenNext application: [Cloudflare OpenNext adapter guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/).
