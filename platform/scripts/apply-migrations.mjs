/**
 * Applies all SQL files in supabase/migrations/ to the linked Supabase project.
 * Reads connection details from .env.local.
 *
 * Usage: node scripts/apply-migrations.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');

// Load .env.local
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const REF = env.SUPABASE_PROJECT_REF;
const PASSWORD = env.SUPABASE_DB_PASSWORD;
if (!REF || !PASSWORD) {
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_DB_PASSWORD in .env.local');
  process.exit(1);
}

// Try direct connection first, then pooler regions if it fails
const candidates = [
  `postgresql://postgres:${encodeURIComponent(PASSWORD)}@db.${REF}.supabase.co:5432/postgres`,
  `postgresql://postgres.${REF}:${encodeURIComponent(PASSWORD)}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${REF}:${encodeURIComponent(PASSWORD)}@aws-0-eu-central-2.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${REF}:${encodeURIComponent(PASSWORD)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
];

let client = null;
let lastError = null;
for (const cs of candidates) {
  const c = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    client = c;
    const host = new URL(cs).host;
    console.log(`✓ Connected via ${host}`);
    break;
  } catch (err) {
    lastError = err;
    try { await c.end(); } catch {}
  }
}
if (!client) {
  console.error('Could not connect to any Supabase endpoint.');
  console.error(lastError?.message ?? lastError);
  process.exit(1);
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log(`Applying ${files.length} migrations...\n`);

for (const file of files) {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
  process.stdout.write(`→ ${file} ... `);
  try {
    await client.query(sql);
    console.log('✓');
  } catch (err) {
    console.log(`✗\n  ${err.message}`);
    process.exit(1);
  }
}

console.log('\nAll migrations applied.');
await client.end();
