import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Bugfixing #1 mobile UI contract", () => {
  it("keeps the compact dashboard order and clickable monthly drill-downs", () => {
    const dashboard = read("app/(protected)/page.tsx");
    expect(dashboard.indexOf("wealth-grid")).toBeLessThan(dashboard.indexOf("compact-stats"));
    expect(dashboard.indexOf("compact-stats")).toBeLessThan(dashboard.indexOf("<CompactAccountList"));
    expect(dashboard.indexOf("<CompactAccountList")).toBeLessThan(dashboard.indexOf("recentTransactions"));
    expect(dashboard).toContain("/transactions?kind=expense");
    expect(dashboard).toContain("/transactions?kind=income");
  });

  it("uses compact account rows without visible reorder or archive controls", () => {
    const manager = read("components/accounts-manager.tsx");
    expect(manager).toContain("CompactAccountList");
    expect(manager).toContain("archivedAccountsHint");
    expect(manager).not.toContain("reorderAccountAction");
    expect(manager).not.toContain("archiveAccountAction");
  });

  it("offers explicit archived-account recovery and safe removal messaging", () => {
    const details = read("components/account-details.tsx");
    const actions = read("app/actions.ts");
    expect(details).toContain("restoreAccountAction");
    expect(details).toContain("confirmAccountRemoval");
    expect(actions).toContain('supabase.rpc("remove_or_archive_account"');
    expect(actions).not.toContain("removeEmptyAccountAction");
  });

  it("exposes month/year filters, report views, and a secondary PDF option", () => {
    const transactions = read("app/(protected)/transactions/page.tsx");
    const statistics = read("components/statistics-dashboard.tsx");
    expect(transactions).toContain('name="month"');
    expect(transactions).toContain('name="year"');
    expect(statistics).toContain("yearlyView");
    expect(statistics).toContain("monthlyView");
    expect(statistics).toContain('<details className="report-export">');
  });

  it("prevents duplicate onboarding submission and confirms completion on the dashboard", () => {
    const onboarding = read("components/onboarding-form.tsx");
    const dashboard = read("app/(protected)/page.tsx");
    expect(onboarding).toContain("useActionState");
    expect(onboarding).toContain("disabled={pending}");
    expect(dashboard).toContain("onboardingComplete");
  });
});
