import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migration = readFileSync(join(root, "supabase/migrations/202610190001_foundation.sql"), "utf8");

describe("database security declaration", () => {
  const tables = ["accounts", "categories", "financial_events", "ledger_entries", "transfer_details", "investment_valuations", "exchange_rates", "user_settings", "report_snapshots"];
  for (const table of tables) {
    it(`forces RLS for ${table}`, () => {
      expect(migration).toContain("alter table public.%I force row level security");
      expect(migration).toContain(`'${table}'`);
    });
  }

  it("does not grant financial tables to anonymous users", () => {
    expect(migration).toContain("revoke all on all tables in schema public from anon");
    expect(migration).not.toMatch(/grant\s+(select|insert|update|delete)[^;]+\s+to\s+anon/i);
  });

  it("keeps owner identifiers in a private schema", () => {
    expect(migration).toContain("create table private.owner_allowlist");
    expect(migration).toContain("revoke all on schema private from public, anon, authenticated");
  });
});

describe("public source hygiene", () => {
  it("contains no committed environment files", () => {
    const files = walk(root).filter((file) => !file.includes("node_modules") && !file.includes(".git"));
    expect(files.filter((file) => /(^|[\\/])\.env($|\.)/.test(file) && !file.endsWith(".env.example"))).toEqual([]);
  });
});

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    if (["node_modules", ".git", ".next"].includes(name)) return [];
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
