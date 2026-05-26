#!/usr/bin/env node
/**
 * Apply SQL files in supabase/migrations/ to the Postgres database.
 *
 * Requires DATABASE_URL in .env (Supabase → Project Settings → Database → URI).
 *
 * Usage:
 *   npm run db:migrate
 *   npm run db:migrate -- --status
 *   npm run db:migrate -- --dry-run
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");
const MIGRATIONS_TABLE = "blitz_schema_migrations";

dotenv.config({ path: join(root, ".env") });

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const statusOnly = args.has("--status");

function resolveDatabaseUrl() {
  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_DATABASE_URL;
  if (!url?.trim()) {
    console.error(
      "Missing DATABASE_URL in .env\n\n" +
        "Supabase: Project Settings → Database → Connection string → URI (Session mode).\n" +
        "Add to .env:\n" +
        "  DATABASE_URL=postgresql://postgres.[ref]:[password]@....supabase.com:5432/postgres\n"
    );
    process.exit(1);
  }
  return url.trim();
}

function listMigrationFiles() {
  if (!existsSync(migrationsDir)) {
    console.error(`Migrations folder not found: ${migrationsDir}`);
    process.exit(1);
  }
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.${MIGRATIONS_TABLE} (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(client) {
  const res = await client.query(`SELECT name FROM public.${MIGRATIONS_TABLE} ORDER BY name`);
  return new Set(res.rows.map((r) => r.name));
}

let lastDatabaseUrl = "";

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  lastDatabaseUrl = databaseUrl;
  const files = listMigrationFiles();

  if (files.length === 0) {
    console.log("No .sql files in supabase/migrations/");
    return;
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const pending = files.filter((f) => !applied.has(f));

    console.log(`Database: ${databaseUrl.replace(/:[^:@/]+@/, ":****@")}`);
    console.log(`Migrations: ${files.length} total, ${applied.size} applied, ${pending.length} pending\n`);

    if (statusOnly) {
      for (const f of files) {
        console.log(`  ${applied.has(f) ? "✓" : "○"} ${f}`);
      }
      return;
    }

    if (pending.length === 0) {
      console.log("Nothing to migrate.");
      return;
    }

    for (const file of pending) {
      const path = join(migrationsDir, file);
      const sql = readFileSync(path, "utf8");
      console.log(`→ ${file}`);

      if (dryRun) {
        console.log(`  (dry-run, ${sql.length} bytes)`);
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO public.${MIGRATIONS_TABLE} (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
          [file]
        );
        await client.query("COMMIT");
        console.log(`  ✓ applied`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  ✗ failed: ${err.message}`);
        process.exit(1);
      }
    }

    if (dryRun) {
      console.log("\nDry run complete — no changes written.");
    } else {
      console.log("\nMigrations complete.");
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  const msg = err.message || String(err);
  console.error(msg);
  if (/ENOTFOUND/i.test(msg) && /db\.[a-z0-9]+\.supabase\.co/i.test(lastDatabaseUrl)) {
    console.error(
      "\nHint: db.<project>.supabase.co is IPv6-only. Many Windows setups cannot reach it.\n" +
        "Use the Session pooler URI instead (Supabase → Connect → Session mode):\n" +
        "  postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres\n" +
        "Encode # in the password as %23 and wrap DATABASE_URL in double quotes in .env."
    );
  }
  process.exit(1);
});
