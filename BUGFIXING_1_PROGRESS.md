# SALDO — BUGFIXING #1 Progress

Last updated: 2026-10-29

## Current phase

Phase 5 — Awaiting production migration authorization. Application work for Phases 1–5, the isolated database integration suite, and the complete local application suite are verified on the development branch. Production migration, authenticated production measurements, deployment, and physical iPhone verification are still pending.

## Completed requirements

- Reviewed the original Bugfixing #1 specification and the relevant bundled Next.js 16 documentation.
- Added an atomic, owner-authorized transaction-edit RPC with same-currency account moves, optimistic concurrency, and regression coverage.
- Kept active EUR/USD savings accounts eligible for appropriate income, expense, and transfer operations.
- Added exact current/historical Frankfurter conversion, stale/missing-rate handling, preserved dates, cached public reference data, and fail-closed totals.
- Added iOS safe-area layout, bottom navigation/home-indicator handling, keyboard-safe sheets, route loading UI, and per-tab pending feedback.
- Added exact Serbian and English monetary formatting without unsafe JavaScript number conversion.
- Implemented compact dashboard Variant A in the required order, separate spending-money and total-net-worth indicators, compact monthly cards, account rows, and recent transactions.
- Redesigned Accounts around compact rows and account detail screens; removed visible reorder/archive toolbars, added rename/reconciliation/history, prominent IBKR valuation updates, and safe empty-account deletion.
- Added clickable income/expense monthly drill-downs, month/year navigation, full history, totals, filters, descriptions, and editable transaction lists.
- Added monthly/yearly reports, previous-month comparison, savings change, category donut details, cash-flow/net-worth charts, IBKR valuation history, and investment result calculations that exclude contributions/withdrawals.
- Kept PDF export as an optional secondary disclosure instead of a prominent action.
- Localized known default account names at display time only, localized remaining form labels, and centralized the default Serbian date format (`28.10.2026.`).
- Added onboarding pending/error handling, duplicate-submit prevention, idempotency verification, automatic dashboard navigation, and success confirmation.
- Confirmed `.env.local` is ignored and untracked without displaying its values.
- Confirmed the public repository source and production browser bundle contain no detected secrets.
- Started a Docker-backed isolated Supabase stack, applied the full migration chain locally, and passed all 30 pgTAP finance/RLS checks. The synthetic tests ran transactionally and did not touch production data.
- Hardened `update_financial_event_v2` so expense/income edits require an active owner category of the matching kind; balance adjustments preserve the existing optional-category behavior.

## Partially completed requirements

- Expense account editing: application code and the 14-check pgTAP financial regression test pass in an isolated local Supabase stack; only the explicitly approved production migration and post-migration verification remain.
- EUR Savings selector: application filtering is fixed and unit-tested; the existing production account row still needs a private read-only active/archived status check after deployment.
- Navigation performance: private queries are request-deduplicated, route payloads are bounded by period, links prefetch normally, charts remain route-scoped, and pending/loading feedback is immediate. Comparable authenticated before/after timing has not been measured because no test credential/session may be embedded or logged.
- Mobile verification: automated Desktop Chrome and emulated iPhone tests pass; physical iPhone 17/Safari/standalone PWA testing has not occurred.

## Remaining requirements

- Obtain explicit owner authorization before applying `202610290001_atomic_event_account_edit.sql` to production. The latest dry-run confirms it is the only pending migration.
- After an approved migration, run live owner/unauthorized/RLS regression checks without exposing or altering real financial data.
- Deploy the verified application only after the database RPC exists in production; pushing application code first would break transaction editing.
- Measure authenticated main-tab navigation before/after under comparable conditions and record actual results.
- Verify the completed deployment on the physical iPhone 17 in Safari and installed standalone PWA mode.

## Modified areas

- `supabase/migrations/202610290001_atomic_event_account_edit.sql` and `supabase/tests/finance.test.sql` — pending atomic edit RPC and isolated ledger regression coverage.
- `app/actions.ts`, `lib/data.ts`, and finance helpers — validated mutations, request-scoped deduplication, bounded event queries, exact conversions, reports, and display helpers.
- `app/(protected)` and `components` — compact dashboard/accounts, details/history, monthly drill-down, reports/charts, loading states, and onboarding feedback.
- `app/globals.css` — safe areas, fixed navigation, compact mobile layouts, report/chart responsiveness, sheets, and skeleton states.
- `lib/i18n` — centralized labels, known default account-name display localization, and date formatting.
- `tests/unit`, `tests/security`, and `e2e` — finance, formatting, reports, mobile contracts, source security, recovery, desktop, and emulated-iPhone coverage.

## Relevant test results

- TypeScript: passed.
- ESLint: passed with zero warnings.
- Unit/regression/security suite: 64 passed across 11 files.
- Explicit security suite: 14 passed.
- Playwright: 8 passed on Desktop Chrome and the emulated iPhone profile.
- Production build: passed with Next.js 16.4.2.
- Browser bundle scan: passed.
- Secret scan: passed across 101 repository files.
- Production dependency audit: no known vulnerabilities.
- Frankfurter connectivity: live EUR/RSD current and date-range endpoints previously responded successfully from the development machine.
- Supabase isolated pgTAP suite: 30 passed across 2 SQL files (14 financial checks and 16 RLS/schema checks), including both category-mismatch directions and category-free balance adjustment.
- Supabase migration dry-run: repeated after the isolated tests; exactly `202610290001_atomic_event_account_edit.sql` remains pending and nothing was applied.
- Supabase remote database lint: completed with no error and one pre-existing warning in `public.create_transfer` about an explicit text-to-enum assignment cast.
- Supabase local stack: stopped cleanly after testing; its retained local volume contains no committed or production data.

## Known issues and constraints

- Production does not yet contain `update_financial_event_v2`; do not deploy this branch before the approved migration sequence.
- The existing `public.create_transfer` lint warning comes from the already-applied foundation function. It is not a reported runtime failure or a security bypass; any cleanup must be a separate forward migration, never an edit/reset of production history.
- The production EUR Savings status has not been queried because diagnostics must not emit private financial records.
- Actual authenticated navigation timing and physical iPhone behavior remain unverified; do not invent measurements or claim device testing.
- Local Next.js/Playwright and Docker child processes require execution outside the managed Windows sandbox.
- All services remain on free tiers; no paid branching, SMTP, backup, or deployment service was added.

## Git state

- Current branch: `codex/bugfixing-1`
- Latest verified implementation/test commit: `7ea4380`
- Mobile/report implementation commit: `245e11f`
- Previous Phase 1 commits: `d98165f`, `992358a`
- Deployment status: production remains on the previously verified `main` (`2ab5c8e`); the development branch has not been pushed or deployed.
- Pending database migrations: `202610290001_atomic_event_account_edit.sql` (dry-run only, not applied).

## Exact next implementation step

Request explicit owner authorization to apply the single pending, non-destructive production migration `202610290001_atomic_event_account_edit.sql`. After approval, apply it before application deployment, run live read-only/RLS regression checks, then review and push the verified branch to `main` for Vercel deployment.
