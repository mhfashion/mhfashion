# Documents

This folder holds documents only, in Markdown, one topic per file. The plan is `Plan/PLAN.md`, the SQL is in
`SQL/`, and nothing else belongs here. A new document is added to the table below in the same change; the layout
test checks that every file here is listed.

| File | Topic | Update it when |
|---|---|---|
| `DOCUMENTATION.md` | the work log, code audit, guide maintenance, admin visual reference, and the work record carried over from the former TODO file | a website task is finished |
| `EDITOR.md` | how the editor behaves, written from the source | editor behaviour changes |
| `PRINT-BUNDLE.md` | the files in an order's press bundle | the bundle changes |
| `MH-DELIVERY.md` | the MH Delivery quote and order payload | the delivery contract changes |
| `R2-STORAGE.md` | the R2 bucket layout, key patterns and upload rules | the bucket layout changes |
| `APP.md` | the Flutter app in `App/`: screens, the shared catalogue, delivery fees and orders | a screen, a data source or the app's build changes |
| `ASSETS-WORKER-DEPLOY.md` | the two workflow files for the assets Worker and the bucket backup, kept here until a token with the `workflow` scope adds them | they are added to `.github/workflows/` |

Related places: `Plan/PLAN.md` (Part I project plan, Part II editor plan), `SQL/` (numbered migrations),
`Worker/assets.ts` (the R2 asset Worker, once built), `App/` (the Flutter app), `AGENTS.md` (agent rules) and `README.md` (repository map).
