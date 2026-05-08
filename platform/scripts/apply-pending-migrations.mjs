/**
 * One-shot script: connects to Supabase Postgres directly, checks
 * which migrations (0018, 0019) need to run by inspecting the
 * `listings` columns, then applies the missing ones.
 *
 * Auth: SUPABASE_DB_PASSWORD + SUPABASE_PROJECT_REF from .env.local —
 * same vars the rest of the codebase uses, no extra access token
 * needed.
 *
 * Idempotent: each ALTER is wrapped in `IF NOT EXISTS` (column adds)
 * or pre-checked (NOT NULL drop, constraints) so re-running is safe.
 */
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const ENV_PATH = path.resolve('.env.local');
const env = Object.fromEntries(
  fs
    .readFileSync(ENV_PATH, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [k, ...rest] = l.split('=');
      return [k, rest.join('=')];
    }),
);

const PROJECT_REF = env.SUPABASE_PROJECT_REF;
const DB_PASSWORD = env.SUPABASE_DB_PASSWORD;
if (!PROJECT_REF || !DB_PASSWORD) {
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_DB_PASSWORD in .env.local');
  process.exit(1);
}

// Supabase direct DB endpoint. Pooler also works but direct is simpler
// for one-shot DDL.
const conn = {
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
};

async function main() {
  const client = new Client(conn);
  await client.connect();
  console.log('connected to', conn.host);

  // Read current listings columns + nullability of building_id.
  const colsRes = await client.query(`
    select column_name, is_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = 'listings'
    order by column_name
  `);
  const cols = new Map(colsRes.rows.map((r) => [r.column_name, r]));
  const has = (name) => cols.has(name);
  const buildingIdNullable = cols.get('building_id')?.is_nullable === 'YES';

  console.log('— current schema ----------------------');
  console.log('  has_technical_passport :', has('has_technical_passport'));
  console.log('  street_address         :', has('street_address'));
  console.log('  district_id            :', has('district_id'));
  console.log('  latitude               :', has('latitude'));
  console.log('  longitude              :', has('longitude'));
  console.log('  has_elevator           :', has('has_elevator'));
  console.log('  year_built             :', has('year_built'));
  console.log('  building_id nullable   :', buildingIdNullable);
  console.log('---------------------------------------');

  // ─── Migration 0018: has_technical_passport ──────────────
  if (!has('has_technical_passport')) {
    console.log('applying 0018: has_technical_passport...');
    await client.query(`alter table listings add column has_technical_passport boolean`);
    console.log('  ✓ applied');
  } else {
    console.log('0018 already applied (has_technical_passport exists) — skip');
  }

  // ─── Migration 0019: standalone listings ──────────────────
  // Each piece is idempotent — re-runnable without errors.
  if (buildingIdNullable) {
    console.log('0019: building_id already nullable — skip drop NOT NULL');
  } else {
    console.log('applying 0019: alter listings drop building_id NOT NULL...');
    await client.query(`alter table listings alter column building_id drop not null`);
    console.log('  ✓ applied');
  }

  const addCol = async (name, ddl) => {
    if (has(name)) {
      console.log(`0019: ${name} already exists — skip`);
    } else {
      console.log(`applying 0019: add column ${name}...`);
      await client.query(ddl);
      console.log('  ✓ applied');
    }
  };
  await addCol('street_address', `alter table listings add column street_address text`);
  await addCol(
    'district_id',
    `alter table listings add column district_id uuid references districts(id)`,
  );
  await addCol('latitude', `alter table listings add column latitude numeric(9, 6)`);
  await addCol('longitude', `alter table listings add column longitude numeric(9, 6)`);
  await addCol('has_elevator', `alter table listings add column has_elevator boolean`);
  await addCol('year_built', `alter table listings add column year_built int`);

  // Constraints — `add constraint if not exists` isn't supported on
  // older Postgres, so check via pg_constraint first.
  const constraintExists = async (name) => {
    const r = await client.query(
      `select 1 from pg_constraint where conname = $1`,
      [name],
    );
    return r.rowCount > 0;
  };
  if (await constraintExists('listings_standalone_or_in_building')) {
    console.log('0019: listings_standalone_or_in_building already exists — skip');
  } else {
    console.log('applying 0019: listings_standalone_or_in_building check constraint...');
    await client.query(`
      alter table listings add constraint listings_standalone_or_in_building check (
        building_id is not null or district_id is not null
      )
    `);
    console.log('  ✓ applied');
  }
  if (await constraintExists('listings_year_built_sane')) {
    console.log('0019: listings_year_built_sane already exists — skip');
  } else {
    console.log('applying 0019: listings_year_built_sane check constraint...');
    await client.query(`
      alter table listings add constraint listings_year_built_sane check (
        year_built is null or (year_built between 1800 and 2100)
      )
    `);
    console.log('  ✓ applied');
  }

  // Index — IF NOT EXISTS is supported.
  await client.query(`create index if not exists listings_district_idx on listings(district_id)`);
  console.log('0019: listings_district_idx created (or already existed)');

  // Force PostgREST to refresh its schema cache so the new district_id
  // FK becomes visible immediately. Without this, the listings →
  // districts join wouldn't be available until the next process
  // restart of postgrest. Standard Supabase pattern.
  await client.query(`notify pgrst, 'reload schema'`);
  console.log('schema cache reload notified');

  await client.end();
  console.log('— done ✓');
}

main().catch((err) => {
  console.error('migration failed:', err);
  process.exit(1);
});
