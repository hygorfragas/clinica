#!/usr/bin/env node
/**
 * Aplica a migração do bucket Storage `clinical` direto no Postgres.
 *
 * Requer no .env.local (ou ambiente):
 *   DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[SENHA]@...supabase.com:6543/postgres
 *
 * Obtenha a URI em: Supabase Dashboard → Project Settings → Database → Connection string → URI.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

dotenv.config({ path: join(root, ".env.local") });
dotenv.config({ path: join(root, ".env") });

const url =
  process.env.DATABASE_URL?.trim() ||
  process.env.SUPABASE_DB_URL?.trim() ||
  process.env.DIRECT_URL?.trim();

if (!url) {
  console.error(
    "Configure DATABASE_URL (ou SUPABASE_DB_URL) no .env.local com a connection string do Postgres do projeto.",
  );
  console.error(
    "Painel: Settings → Database → Connection string → URI (modo Session ou Transaction).",
  );
  console.error(
    "\nAlternativa: abra o SQL Editor e execute o arquivo:\n  supabase/migrations/20260407150000_clinical_storage_bucket.sql",
  );
  process.exit(1);
}

const sqlPath = join(
  root,
  "supabase/migrations/20260407150000_clinical_storage_bucket.sql",
);
const sql = readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(sql);
  console.log("OK: bucket clinical e políticas de Storage aplicados.");
} catch (e) {
  console.error("Erro ao executar migração:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
