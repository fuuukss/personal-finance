# SALDO — BUGFIXING #1 Progress

Last updated: 2026-10-29

## Current phase

Phase 1 — Financial correctness (implementation complete locally; production migration and live verification pending)

## Completed requirements

- Original Bugfixing #1 specification reviewed in full.
- Repository confirmed clean and synchronized with `origin/main` at the start of this cycle.
- Dedicated development branch created so incomplete work cannot deploy automatically.
- Added an atomic, owner-authorized transaction-edit RPC that can move an expense between same-currency accounts without duplicate ledger movements.
- Added optimistic concurrency protection for transaction edits and explicit currency compatibility checks.
- Added account and category selectors to transaction editing.
- Centralized transaction account eligibility so active EUR Savings and USD Savings accounts remain available for income, expense, and transfer operations.
- Added current and historical Frankfurter reference-rate retrieval with exact decimal parsing, preserved rate dates, stale-rate detection, cached public responses, reverse-pair support, and fail-closed behavior.
- Fixed ESLint so ignored `.next-e2e` build artifacts are not linted.
- Confirmed `.env.local` is ignored and untracked without displaying its contents.

## Partially completed requirements

- Expense account editing: code and isolated pgTAP regression test are ready; the migration is not applied to production.
- EUR Savings selector: application filtering is fixed and covered by unit tests; the production account row still needs a post-deployment read-only status check.
- Exchange rates: implementation and mocked failure tests pass; end-to-end production verification remains pending deployment.

## Remaining requirements

- Obtain explicit owner authorization before applying the pending production migration, then run the SQL integration/security tests and live read-only verification.
- Phase 2 — iPhone safe areas, navigation performance, and number formatting.
- Phase 3 — compact dashboard Variant A and Accounts redesign.
- Phase 4 — monthly drill-down, historical statistics, and chart fixes.
- Phase 5 — localization, onboarding feedback, mobile polish, full security verification, and release.

## Modified files

- `app/actions.ts` — validated v2 event update action with concurrency and compatibility feedback.
- `app/(protected)/page.tsx`, `app/(protected)/transactions/page.tsx`, `app/(protected)/statistics/page.tsx` — provide account/category context and reference-rate coverage.
- `app/api/exchange-rate/route.ts` — shared validated Frankfurter client.
- `components/transaction-list.tsx`, `components/transaction-sheet.tsx` — account-aware edit/create selectors.
- `lib/data.ts`, `lib/finance/types.ts`, `lib/validation/finance.ts` — event versions and rate data path.
- `lib/finance/account-eligibility.ts`, `lib/finance/exchange-rates.ts` — new focused finance helpers.
- `supabase/migrations/202610290001_atomic_event_account_edit.sql` — pending, non-destructive RPC migration.
- `supabase/tests/finance.test.sql` — isolated ledger regression tests.
- `tests/unit/account-eligibility.test.ts`, `tests/unit/exchange-rates.test.ts`, `tests/unit/reports.test.ts` — regression coverage.
- `eslint.config.mjs` — ignore generated e2e output.
- `BUGFIXING_1_PROGRESS.md` — persistent continuation checkpoint.

## Relevant test results

- TypeScript: passed.
- ESLint: passed.
- Unit/regression tests: 43 passed across 7 files.
- Playwright: 6 passed on Desktop Chrome and emulated iPhone WebKit profile.
- Production build: passed after the final Phase 1 validation adjustment.
- Browser bundle scan: passed.
- Secret scan: passed (90 repository files at the time of the scan).
- Frankfurter connectivity: live EUR/RSD single-rate and date-range endpoints responded successfully from the development machine on 2026-10-29.
- Supabase migration dry-run: passed as a dry run; exactly `202610290001_atomic_event_account_edit.sql` is pending and was not applied.
- Supabase SQL integration test: not run because Docker/Podman is unavailable locally. Do not treat the pgTAP file as executed.

## Known issues

- Production still lacks `update_financial_event_v2`; this branch must not be deployed before the approved migration sequence.
- The exact production status of the existing EUR Savings row (active versus archived) has not been queried because no private financial data is emitted through diagnostics.
- Local Next.js/Playwright child workers require running outside the managed sandbox on Windows; the tests passed when granted that permission.
- Production migrations remain prohibited until SQL review, compatibility checks, dry-run/security checks, and explicit owner authorization.

## Git state

- Current branch: `codex/bugfixing-1`
- Latest verified baseline commit: `2ab5c8e` (new checkpoint commit pending)
- Deployment status: production remains on the previously verified `main`; this branch is not deployed.
- Pending database migrations: `202610290001_atomic_event_account_edit.sql` (dry-run only, not applied).

## Exact next implementation step

Start Phase 2 by reading the Next.js 16 navigation and PWA guides, establish repeatable navigation timing, then implement iOS safe-area/layout fixes, immediate tab feedback, and locale-correct number formatting without caching private financial records publicly.
