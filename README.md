# MH Fashion

A print-on-demand platform: customers design apparel in the browser and order it printed. The site is a
Next.js app that runs on a Cloudflare Worker; files live in Cloudflare R2; data lives in Supabase.

## Repository map

| Place | What is in it |
|---|---|
| `Plan/PLAN.md` | the only plan file: Part I the project plan, Part II the editor plan |
| `Doc/` | documents; start at `Doc/README.md` |
| `SQL/` | numbered SQL files, applied in order in the Supabase SQL Editor |
| `Worker/` | the R2 asset Worker, one file (created when it is built) |
| `apps/web/` | the website and the editor |
| `tests/` | the test suite (`node --test tests/*.test.cjs`) |
| `scripts/` | helper scripts |
| `AGENTS.md` | rules for AI agents working in this repository |

## Rules

- There is one plan file. Finished work is recorded in `Doc/DOCUMENTATION.md`.
- `Doc/` holds documents only, `SQL/` holds SQL only, `Worker/` holds one file, `Plan/` holds one file.
- `tests/repo-layout.test.cjs` fails if the layout drifts.
