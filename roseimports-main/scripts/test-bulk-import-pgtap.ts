import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import pg from "pg";

const databaseUrl = process.env.SUPABASE_DB_URL;

assert(databaseUrl, "SUPABASE_DB_URL não configurada.");

const databaseHost = new URL(databaseUrl).hostname;
assert(
  ["127.0.0.1", "localhost"].includes(databaseHost),
  "Recusado: pgTAP só pode rodar no PostgreSQL local.",
);

const sql = await readFile(
  resolve(
    process.cwd(),
    "supabase/tests/database/0008_bulk_product_import.test.sql",
  ),
  "utf8",
);
const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: false,
});

await client.connect();

try {
  const rawResults = (await client.query(sql)) as unknown;
  const results = (Array.isArray(rawResults) ? rawResults : [rawResults]) as Array<{
    rows?: Array<Record<string, unknown>>;
  }>;
  const tapLines = results
    .flatMap((result) => result.rows ?? [])
    .flatMap((row) => Object.values(row))
    .filter(
      (value): value is string =>
        typeof value === "string" && /^(?:ok|not ok|1\.\.|#)/.test(value),
    );

  assert(tapLines.includes("1..30"), "Plano pgTAP esperado não foi emitido.");
  assert.equal(
    tapLines.filter((line) => line.startsWith("ok ")).length,
    30,
    "Nem todas as asserções pgTAP passaram.",
  );
  assert.equal(
    tapLines.filter((line) => line.startsWith("not ok")).length,
    0,
    "O pgTAP encontrou falhas.",
  );

  console.log(tapLines.join("\n"));
} finally {
  await client.end();
}
