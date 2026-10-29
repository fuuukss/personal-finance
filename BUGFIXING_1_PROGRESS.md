# SALDO — BUGFIXING #1 Progress

Last updated: 2026-10-29

## Current phase

Phase 5 — Post-deployment owner/device verification. Application work for Phases 1–5, isolated database integration, the complete test suite, production migration, GitHub publication, Vercel deployment, and anonymous production smoke checks are complete. Authenticated owner measurements and physical iPhone verification remain.

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
- Applied `202610290001_atomic_event_account_edit.sql` to the correctly linked production Supabase project after URL/ref matching, reviewed-hash confirmation, migration listing, and a one-migration dry-run.
- Confirmed production migration history is synchronized and a new dry-run reports no pending migrations.
- Passed 14/14 production-safe RPC/privilege/RLS checks, including denial of a synthetic unauthorized authenticated RPC call before financial data access.
- Fast-forwarded all 10 Bugfixing commits into `main`, pushed without force, and confirmed GitHub `verify`, `dependency-audit`, and `database-security` jobs succeeded.
- Confirmed Vercel deployed the release commit and passed Chromium/WebKit production smoke checks for HTTPS login routing, protected-route denial, CSP/HSTS, standalone manifest, and mobile overflow.

## Partially completed requirements

- Expense account editing: application code, isolated financial regression tests, production RPC deployment, and post-migration authorization/RLS checks are complete. An owner write path will be exercised only through the deployed application, never against an existing record for testing.
- EUR Savings selector: application filtering is fixed and unit-tested; the existing production account row still needs a private read-only active/archived status check after deployment.
- Navigation performance: private queries are request-deduplicated, route payloads are bounded by period, links prefetch normally, charts remain route-scoped, and pending/loading feedback is immediate. Comparable authenticated before/after timing has not been measured because no test credential/session may be embedded or logged.
- Mobile verification: automated Desktop Chrome and emulated iPhone tests pass; physical iPhone 17/Safari/standalone PWA testing has not occurred.

## Remaining requirements

- Verify successful owner login and protected page loading using the owner's existing credentials; credentials must not be shared with diagnostics.
- Verify the owner edit flow with an owner-approved synthetic or newly created transaction; do not alter an existing financial record merely for testing.
- Measure authenticated main-tab navigation before/after under comparable conditions and record actual results.
- Verify the completed deployment on the physical iPhone 17 in Safari and installed standalone PWA mode.

## Modified areas

- `supabase/migrations/202610290001_atomic_event_account_edit.sql`, `supabase/tests/finance.test.sql`, and `supabase/tests/production_verification.test.sql` — deployed atomic edit RPC plus isolated and production-safe regression coverage.
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
- Secret scan: passed across 102 repository files, with no unexpected environment files or detected secret patterns in reachable Git history.
- Production dependency audit: no known vulnerabilities.
- Frankfurter connectivity: live EUR/RSD current and date-range endpoints previously responded successfully from the development machine.
- Supabase isolated SQL suite: 44 passed across 3 SQL files (14 financial, 16 RLS/schema, and 14 production-contract checks).
- Supabase production migration: `202610290001_atomic_event_account_edit.sql` applied successfully; local/remote history matches and the post-apply dry-run is up to date with zero pending migrations.
- Supabase production verification: 14/14 RPC catalog, privilege, owner-guard, category-guard, RLS, anonymous-denial, and unauthorized-RPC checks passed without reading or changing financial rows.
- GitHub Actions: `verify`, `dependency-audit`, and `database-security` completed successfully for the release commit.
- Production smoke: Chromium and mobile WebKit passed login redirect, no-signup, protected-route, manifest, security-header, and overflow checks.
- Supabase remote database lint: completed with no error and one pre-existing warning in `public.create_transfer` about an explicit text-to-enum assignment cast.
- Supabase local stack: stopped cleanly after testing; its retained local volume contains no committed or production data.

## Known issues and constraints

- Production contains `update_financial_event_v2` and the matching application release is deployed.
- The existing `public.create_transfer` lint warning comes from the already-applied foundation function. It is not a reported runtime failure or a security bypass; any cleanup must be a separate forward migration, never an edit/reset of production history.
- The production EUR Savings status has not been queried because diagnostics must not emit private financial records.
- Actual authenticated navigation timing and physical iPhone behavior remain unverified; do not invent measurements or claim device testing.
- Local Next.js/Playwright and Docker child processes require execution outside the managed Windows sandbox.
- All services remain on free tiers; no paid branching, SMTP, backup, or deployment service was added.

## Git state

- Current branch: `main`
- Latest verified implementation/test commit: `b550d47`
- Mobile/report implementation commit: `245e11f`
- Previous Phase 1 commits: `d98165f`, `992358a`
- Release integration commit: `4742f938b19a903a527e060c3949e0031fdf8f15`
- Deployment status: GitHub `main` and Vercel production contain the Bugfixing #1 release; anonymous production smoke checks passed.
- Pending database migrations: none.

## Exact next implementation step

On the physical iPhone 17, sign in with the existing owner account and verify dashboard safe areas, tab timing, EUR Savings visibility, one owner-approved synthetic expense edit between same-currency accounts, reports, IBKR value editing UI without saving, and standalone PWA behavior. Record real timings and remove only the newly created synthetic transaction after verification.
