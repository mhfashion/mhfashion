# Cloudflare deployment through GitHub Actions

The repository now contains `.github/workflows/deploy-cloudflare.yml`. It runs when changes reach `main` under `apps/web`, the root package manifests, or the workflow itself. It can also be started manually from the GitHub Actions tab with **Run workflow**.

The workflow installs the locked dependency tree, type-checks the web app, runs `npx opennextjs-cloudflare build` from `apps/web`, and deploys with `npx wrangler deploy` using the Worker configuration in `apps/web/wrangler.jsonc`. Only the `main` branch deploys to the production Worker.

## Required GitHub Actions secrets

Add these repository secrets at **GitHub → Settings → Secrets and variables → Actions → New repository secret**:

- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token scoped to the account and Worker deployment permissions. Do not use a global API key.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID that owns `mhfashion.mhfashionmm.workers.dev`.

The API token should have the minimum permissions needed to edit and deploy Workers. Keep the token only in GitHub Actions Secrets; never commit it to the repository or put it in `wrangler.jsonc`.

The workflow does not copy application secrets into GitHub or expose them in logs. Runtime values already configured in Cloudflare should remain there. If the deployed Worker needs a new runtime value, add it as a Cloudflare Worker secret or encrypted environment value separately. In particular, the Guide runtime needs the existing Supabase public URL and anon key available to the Worker runtime; the anon key is designed for public client use, but it still must not be confused with the Supabase service-role key.

## First run

After adding both required secrets, push a change to `main` or use **Run workflow**. Confirm the workflow's `Deploy Worker` step succeeds, then check `https://mhfashion.mhfashionmm.workers.dev/guide`. A failed run should identify whether the issue is missing secrets, dependency/build failure, or Cloudflare authentication/deployment permission.
