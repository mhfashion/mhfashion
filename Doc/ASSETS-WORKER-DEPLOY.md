# The assets Worker and the backup — two workflow files to add

Both files below are written and tested locally, but the session's GitHub token has no
`workflow` scope, so a push that creates them is rejected:

```
refusing to allow a Personal Access Token to create or update workflow
.github/workflows/backup-assets.yml without `workflow` scope
```

Add them with a token that has the `workflow` scope (a classic PAT with `repo` + `workflow`,
or a fine-grained PAT with Contents: read/write and Workflows: read/write), or paste them
into the GitHub web editor. They are already in the working tree of the machine that wrote
them, at the paths named above.

## `.github/workflows/deploy-assets-worker.yml`

```yaml
name: Deploy assets Worker

# Plan §12.1 part 1: the asset service is its own Worker, configured by wrangler.assets.jsonc, and it is
# deployed when its own code, the libraries it bundles, or its configuration changes.
on:
  push:
    branches:
      - main
    paths:
      - "Worker/**"
      - "wrangler.assets.jsonc"
      - "apps/web/src/lib/asset-*.ts"
      - "package.json"
      - "package-lock.json"
      - ".github/workflows/deploy-assets-worker.yml"
  workflow_dispatch:

concurrency:
  group: assets-worker-production
  cancel-in-progress: false

permissions:
  contents: read

jobs:
  deploy:
    name: Validate and deploy the assets Worker
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Check required Cloudflare secrets
        shell: bash
        env:
          HAS_CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_API_TOKEN != '' }}"
          HAS_CLOUDFLARE_ACCOUNT_ID: "${{ secrets.CLOUDFLARE_ACCOUNT_ID != '' }}"
        run: |
          set -euo pipefail
          missing=0
          if [[ "$HAS_CLOUDFLARE_API_TOKEN" != "true" ]]; then
            echo "Missing repository secret: CLOUDFLARE_API_TOKEN"
            missing=1
          fi
          if [[ "$HAS_CLOUDFLARE_ACCOUNT_ID" != "true" ]]; then
            echo "Missing repository secret: CLOUDFLARE_ACCOUNT_ID"
            missing=1
          fi
          if [[ "$missing" -ne 0 ]]; then
            echo "Add the missing GitHub Actions secrets before deploying."
            exit 1
          fi

      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: npm ci --no-audit --no-fund

      - name: Run the asset service tests
        run: node --test tests/assets-worker.test.cjs tests/asset-keys.test.cjs tests/asset-file-type.test.cjs tests/asset-events.test.cjs

      - name: Type-check the Worker
        run: npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom --skipLibCheck Worker/assets.ts

      - name: Validate the Worker bundle
        run: npx wrangler deploy --dry-run --config wrangler.assets.jsonc --outdir /tmp/assets-worker

      - name: Deploy the Worker
        if: ${{ github.ref == 'refs/heads/main' }}
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: npx wrangler deploy --config wrangler.assets.jsonc
```

## `.github/workflows/backup-assets.yml`

```yaml
name: Back up the asset buckets

# Plan §12.2.8: a weekly copy of both buckets into a second bucket (or another account), keeping the
# last four weeks. The site reads R2 directly, so this is the copy that survives a bad delete.
# Needs the CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID secrets, plus the backup target:
#   R2_BACKUP_REMOTE (an rclone remote name, default "r2backup"), R2_BACKUP_BUCKET (default
#   "mh-fashion-backups"), R2_BACKUP_ACCESS_KEY_ID, R2_BACKUP_SECRET_ACCESS_KEY, R2_BACKUP_ENDPOINT.
on:
  schedule:
    - cron: "17 2 * * 1"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  backup:
    name: Copy both buckets
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - name: Check required secrets
        shell: bash
        env:
          HAS_CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_API_TOKEN != '' }}"
          HAS_CLOUDFLARE_ACCOUNT_ID: "${{ secrets.CLOUDFLARE_ACCOUNT_ID != '' }}"
          HAS_BACKUP_KEY: "${{ secrets.R2_BACKUP_ACCESS_KEY_ID != '' }}"
          HAS_BACKUP_SECRET: "${{ secrets.R2_BACKUP_SECRET_ACCESS_KEY != '' }}"
        run: |
          set -euo pipefail
          missing=0
          for pair in \
            "CLOUDFLARE_API_TOKEN=$HAS_CLOUDFLARE_API_TOKEN" \
            "CLOUDFLARE_ACCOUNT_ID=$HAS_CLOUDFLARE_ACCOUNT_ID" \
            "R2_BACKUP_ACCESS_KEY_ID=$HAS_BACKUP_KEY" \
            "R2_BACKUP_SECRET_ACCESS_KEY=$HAS_BACKUP_SECRET"; do
            name="${pair%%=*}"
            value="${pair#*=}"
            if [[ "$value" != "true" ]]; then
              echo "Missing repository secret: $name"
              missing=1
            fi
          done
          if [[ "$missing" -ne 0 ]]; then
            echo "Add the missing GitHub Actions secrets before running the backup."
            exit 1
          fi

      - name: Install rclone
        run: |
          set -euo pipefail
          curl -fsSL https://downloads.rclone.org/rclone-current-linux-amd64.zip -o /tmp/rclone.zip
          unzip -q /tmp/rclone.zip -d /tmp/rclone
          install /tmp/rclone/rclone-*-linux-amd64/rclone /usr/local/bin/rclone
          rclone version

      - name: Configure rclone
        shell: bash
        env:
          R2_BACKUP_ACCESS_KEY_ID: ${{ secrets.R2_BACKUP_ACCESS_KEY_ID }}
          R2_BACKUP_SECRET_ACCESS_KEY: ${{ secrets.R2_BACKUP_SECRET_ACCESS_KEY }}
          R2_BACKUP_ENDPOINT: ${{ secrets.R2_BACKUP_ENDPOINT }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          R2_BACKUP_REMOTE: ${{ vars.R2_BACKUP_REMOTE }}
        run: |
          set -euo pipefail
          endpoint="${R2_BACKUP_ENDPOINT:-https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com}"
          mkdir -p ~/.config/rclone
          cat > ~/.config/rclone/rclone.conf <<CONF
          [${R2_BACKUP_REMOTE:-r2backup}]
          type = s3
          provider = Cloudflare
          access_key_id = ${R2_BACKUP_ACCESS_KEY_ID}
          secret_access_key = ${R2_BACKUP_SECRET_ACCESS_KEY}
          endpoint = ${endpoint}
          acl = private
          CONF
          chmod 600 ~/.config/rclone/rclone.conf

      - name: Copy both buckets into a dated folder
        shell: bash
        env:
          R2_BACKUP_REMOTE: ${{ vars.R2_BACKUP_REMOTE }}
          R2_BACKUP_BUCKET: ${{ vars.R2_BACKUP_BUCKET }}
        run: |
          set -euo pipefail
          remote="${R2_BACKUP_REMOTE:-r2backup}"
          bucket="${R2_BACKUP_BUCKET:-mh-fashion-backups}"
          stamp="$(date -u +%Y-%m-%d)"
          for source in mh-fashion-assets mh-fashion-private; do
            rclone copy "${remote}:${source}" "${remote}:${bucket}/${source}/${stamp}" --checksum --stats-one-line
          done

      - name: Keep the last four weekly copies
        shell: bash
        env:
          R2_BACKUP_REMOTE: ${{ vars.R2_BACKUP_REMOTE }}
          R2_BACKUP_BUCKET: ${{ vars.R2_BACKUP_BUCKET }}
        run: |
          set -euo pipefail
          remote="${R2_BACKUP_REMOTE:-r2backup}"
          bucket="${R2_BACKUP_BUCKET:-mh-fashion-backups}"
          for source in mh-fashion-assets mh-fashion-private; do
            mapfile -t dates < <(rclone lsf --dirs-only "${remote}:${bucket}/${source}" | sed 's#/$##' | sort)
            count=${#dates[@]}
            if (( count > 4 )); then
              for old in "${dates[@]:0:count-4}"; do
                echo "Removing ${source}/${old}"
                rclone purge "${remote}:${bucket}/${source}/${old}"
              done
            fi
          done
```
