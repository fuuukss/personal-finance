# Saldo — personal finance

Private, owner-only personal finance tracking for iPhone and desktop. The application uses a reconstructible financial-event ledger, PostgreSQL `NUMERIC` arithmetic, Supabase Auth/PostgreSQL, forced Row Level Security, and a responsive Next.js PWA.

## What is included

- Owner-only email/password authentication; the application exposes no sign-up flow.
- One-time onboarding with five editable initial accounts and opening balances.
- Conventional and investment accounts, archival, categories, expenses, income, balance-adjustment RPC, and atomic same/cross-currency transfers.
- Manual IBKR valuation history and contribution/withdrawal classification without broker credentials.
- Dashboard, transaction search, Serbian/English UI, historical cash-flow charts, category charts, and local PDF export.
- PWA manifest/icons and a privacy-safe service worker that does not cache authenticated pages or API responses.
- Forced RLS, composite owner-aware foreign keys, idempotency keys, runtime validation, CSP/security headers, secret scan, unit/security tests, and CI.

## Local setup

Requirements: Node.js 22+, pnpm, Docker Desktop, and [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```powershell
pnpm install --frozen-lockfile
supabase start
supabase db reset
Copy-Item .env.example .env.local
pnpm dev
```

Fill `.env.local` with the local values printed by `supabase status`. Do not use a service-role key in any `NEXT_PUBLIC_` variable.

### Provision the owner

1. In Supabase Dashboard, disable public sign-ups and create one user under **Authentication → Users**.
2. Copy that user's UUID.
3. Run this once in the SQL editor, replacing the placeholder:

```sql
insert into private.owner_allowlist(user_id)
values ('OWNER_AUTH_USER_UUID');
```

The UUID is server/database configuration and must not be committed. A valid Supabase user omitted from this table receives the same generic login failure as invalid credentials.

## Verification

```powershell
pnpm check:secrets
pnpm typecheck
pnpm lint
pnpm test
supabase test db
pnpm build
pnpm test:e2e
pnpm audit --prod --audit-level high
```

Database authorization tests require a running local Supabase stack. E2E tests require Playwright browsers (`pnpm exec playwright install chromium`).

## Deploy

1. Run `supabase db start` and `supabase test db` against the disposable local stack. Do not continue if either fails.
2. Create a Supabase Free project. In **Project Settings → Integrations → GitHub**, authorize only this repository, choose it, and set **Working directory** to `.`. Leave **Automatic branching** and **Deploy to production** off; branching is not part of the Free plan and production migrations must remain manual until testing passes.
3. Link the CLI to the project and review the pending migration before running `supabase db push`. Disable sign-up, create the owner, and add the owner's UUID to `private.owner_allowlist`.
4. Import the public GitHub repository into a personal Vercel Hobby project.
5. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `APP_ORIGIN`, and optionally `EXCHANGE_RATE_API_URL` to Vercel. Never add a service-role key to the app.
6. Set the Supabase Site URL and allowed redirect URL to the final HTTPS domain.
7. Deploy, then verify anonymous denial, owner login, logout, a small test transaction, balance reconstruction, and the production security headers.

GitHub's standard hosted runners are free for public repositories, so CI can test migrations in a local Supabase stack without a paid Supabase branch. Supabase Free does not include automatic backups or point-in-time recovery and can pause low-activity projects; follow the user-controlled backup procedure below and resume the project from the Dashboard if needed.

On iPhone, open the HTTPS application in Safari, tap **Share**, choose **Add to Home Screen**, and confirm **Add**.

Backup/recovery instructions are in [docs/BACKUP_AND_RECOVERY.md](docs/BACKUP_AND_RECOVERY.md). Security boundaries and remaining verification requirements are in [docs/SECURITY.md](docs/SECURITY.md).

## Accounting rules

Money is stored as signed `NUMERIC(24,6)` ledger entries and rounded with half-even rules for presentation. Expenses are negative; income and opening balances are positive; adjustments are explicit signed deltas. A transfer creates two entries and one linked transfer record in a single database transaction. Internal transfers, opening balances, adjustments, and investment valuation changes are excluded from ordinary income/expense totals. Historical currency conversion uses the most recent saved rate on or before the event date; missing rates are disclosed and excluded rather than silently replaced with today's rate. Investment profit/loss is `valuation + withdrawals − contributions`; it is not presented as a time- or money-weighted return.

## License

No license is granted. Financial data, exports, environment files, and database backups must never be committed.
