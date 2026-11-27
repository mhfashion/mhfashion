// Plan §17 S4: migration 0009 keeps one normalised `search_text` per row, built by a trigger.
// The test needs a Postgres server it may create databases on, so it skips when `psql` is absent or
// `SEARCH_SQL_TEST_URL` is not set (CI runs the JS tests without a database).
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const url = process.env.SEARCH_SQL_TEST_URL;
const hasPsql = spawnSync("psql", ["--version"], { encoding: "utf8" }).status === 0;
const skip = !hasPsql ? "psql is not installed" : !url ? "SEARCH_SQL_TEST_URL is not set" : false;

const STUBS = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid());
create or replace function auth.uid() returns uuid language sql stable as 'select null::uuid';
create or replace function auth.role() returns text language sql stable as 'select current_user::text';
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
`;

const MIGRATIONS = [
  "SQL/0001_initial_schema.sql",
  "SQL/0002_catalog_fields.sql",
  "SQL/0004_public_catalog_rls.sql",
  "SQL/0005_guide_content.sql",
  "SQL/0006_guide_post_cover_image.sql",
  "SQL/0007_create_super_admin_roles.sql",
  "SQL/0008_product_options_public_read.sql",
  "SQL/0009_search_text.sql",
  "SQL/0010_search_trigram.sql",
  "SQL/0011_search_misses.sql",
];

function psql(database, sql) {
  const result = spawnSync("psql", [database, "-v", "ON_ERROR_STOP=1", "-At", "-c", sql], {
    encoding: "utf8",
    cwd: root,
  });
  if (result.status !== 0) throw new Error(`psql failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function psqlFile(database, file) {
  const result = spawnSync("psql", [database, "-v", "ON_ERROR_STOP=1", "-q", "-f", path.join(root, file)], {
    encoding: "utf8",
    cwd: root,
  });
  if (result.status !== 0) throw new Error(`${file} failed: ${result.stderr.trim()}`);
}

test("migrations 0009 and 0010 fold every record and still find a typo", { skip }, () => {
  const database = `mh_search_test_${process.pid}`;
  psql(url, `drop database if exists ${database}`);
  psql(url, `create database ${database}`);
  try {
    psql(database, STUBS);
    for (const file of MIGRATIONS) psqlFile(database, file);

    const fold = psql(database, `
      select public.normalize_search_text('  Tee   BLACK '),
             public.normalize_search_text(E'\\u1019\\u103C\\u1014\\u103A\\u200B\\u1019\\u102C'),
             public.normalize_search_text(E'\\u1000\\u103D\\u103B'),
             public.normalize_search_text(E'\\u1000\\u1031\\u102C\\u1004\\u103A\\u1038')
    `).split("|");
    assert.deepEqual(fold, ["tee black", "မြန်မာ", "ကျွ", "ကောင်း"], "the SQL fold matches the app's normaliser");

    psql(database, `
      insert into public.products (name, name_my, sub_brand, product_type, slug, tags, aliases)
      values ('Yangon Street Tee', E'\\u101B\\u1014\\u103A\\u1000\\u102F\\u1014\\u103A \\u101C\\u1019\\u103A\\u1038', 'Streetwear', 'T-shirt', 'yangon-street-tee', array['city'], array['downtown'])
    `);
    const searchText = psql(database, `select search_text from public.products where slug = 'yangon-street-tee'`);
    for (const part of ["yangon street tee", "ရန်ကုန်", "streetwear", "t-shirt", "city", "downtown"]) {
      assert.ok(searchText.includes(part), `search_text is missing ${part}: ${searchText}`);
    }

    // A query typed with a zero-width character and the medials in the other order still finds the row.
    const found = psql(database, `
      select name from public.products
      where search_text like '%' || public.normalize_search_text(E'\\u101B\\u1014\\u103A\\u200B\\u1000\\u102F\\u1014\\u103A') || '%'
    `);
    assert.equal(found, "Yangon Street Tee");

    // An update rewrites the column.
    psql(database, `update public.products set tags = array['winter'] where slug = 'yangon-street-tee'`);
    assert.match(psql(database, `select search_text from public.products where slug = 'yangon-street-tee'`), / winter /);

    psql(database, `
      insert into public.guide_categories (slug, name, description, status, published_at)
      values ('editor-guide', 'Editor Guide', 'How the editor works.', 'published', now())
    `);
    psql(database, `
      insert into public.guide_posts (category_id, slug, title, excerpt, sections, status, published_at)
      select id, 'how-the-editor-works', 'How the editor works', 'The print canvas and layers.',
             '[{"heading":"Layers panel","paragraphs":["Drag a layer on the print canvas."],"bullets":["Free transform"]}]'::jsonb,
             'published', now()
      from public.guide_categories where slug = 'editor-guide'
    `);
    const guideText = psql(database, `select search_text from public.guide_posts where slug = 'how-the-editor-works'`);
    for (const part of ["how the editor works", "print canvas", "layers panel", "free transform"]) {
      assert.ok(guideText.includes(part), `guide search_text is missing ${part}: ${guideText}`);
    }

    // Plan §17 S3: a typo still finds the record through the trigram fallback.
    const indexes = psql(database, `select indexname from pg_indexes where indexname like '%trgm%' order by 1`).split("\n");
    assert.deepEqual(indexes, ["guide_posts_search_text_trgm_idx", "products_search_text_trgm_idx"]);

    psql(database, `
      insert into public.products (name, sub_brand, product_type, slug)
      values ('Butterfly Effect', 'MH Sport', 'T-shirt', 'butterfly-effect')
    `);
    assert.equal(psql(database, `select name from public.search_products_fuzzy('buterfly', 40) limit 1`), "Butterfly Effect");
    assert.equal(psql(database, `select name from public.search_products_fuzzy('yangn street', 40) limit 1`), "Yangon Street Tee");
    assert.equal(psql(database, `select count(*) from public.search_products_fuzzy('zzzzqqqq', 40)`), "0", "nonsense finds nothing");
    assert.equal(psql(database, `select count(*) from public.search_products_fuzzy('te', 40)`), "0", "two letters are not a typo search");
    assert.equal(psql(database, `select count(*) from public.search_products_fuzzy('buterfly', 1)`), "1", "the limit is honoured");

    // Plan §17 S8: a search that found nothing is counted, folded, and kept 90 days.
    psql(database, `select public.record_search_miss('  Hoodiee '), public.record_search_miss('hoodiee')`);
    assert.equal(psql(database, `select term || ' ' || hits from public.search_misses`), "hoodiee 2", "one row, folded, counted");
    psql(database, `select public.record_search_miss('x')`);
    assert.equal(psql(database, `select count(*) from public.search_misses`), "1", "a one-letter term is not a miss");
    assert.equal(psql(database, `select term from public.top_search_misses(7, 10)`), "hoodiee");
    psql(database, `
      insert into public.search_misses (term, hits, first_seen, last_seen)
      values ('old-term', 9, now() - interval '120 days', now() - interval '100 days')
    `);
    psql(database, `select public.record_search_miss('new-term')`);
    assert.equal(psql(database, `select count(*) from public.search_misses where term = 'old-term'`), "0", "misses older than 90 days are dropped");
    assert.equal(
      psql(database, `select has_function_privilege('anon', 'public.top_search_misses(integer,integer)', 'execute')`),
      "f",
      "a visitor must not read the shop's search log"
    );
    assert.equal(
      psql(database, `select has_function_privilege('anon', 'public.record_search_miss(text)', 'execute')`),
      "t",
      "the storefront may record a miss"
    );
  } finally {
    psql(url, `drop database if exists ${database}`);
  }
});
