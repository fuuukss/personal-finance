import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
    const trackedFiles = execFileSync("git", ["ls-files", "-z", "--cached"], {
      cwd: root,
      encoding: "utf8",
    }).split("\0").filter(Boolean);

    expect(trackedFiles.filter((file) => /(^|\/)\.env($|\.)/.test(file) && file !== ".env.example")).toEqual([]);
  });

  it("keeps password changes behind recovery authorization", () => {
    const actions = readFileSync(join(root, "app/actions.ts"), "utf8");
    const callback = readFileSync(join(root, "app/auth/callback/route.ts"), "utf8");
    const confirmation = readFileSync(join(root, "app/auth/confirm/route.ts"), "utf8");

    expect(actions).toContain("hasRecoveryAuthorization(user.id, sessionId)");
    expect(actions).toContain("supabase.auth.updateUser({ password })");
    expect(actions).toContain('supabase.rpc("is_current_owner")');
    expect(callback).toContain("exchangeCodeForSession(code)");
    expect(confirmation).toContain('type: "recovery"');
  });
});
