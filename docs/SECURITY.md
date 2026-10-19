# Security operations

## Trust boundary

Supabase Auth establishes identity. `private.owner_allowlist` establishes authorization. Every exposed financial table has forced RLS and policies requiring both `owner_id = auth.uid()` and a private allowlist match. Composite foreign keys bind events, accounts, categories, transfers, and valuations to the same owner. Privileged service-role credentials are neither required nor accepted by the browser application.

Server Actions repeat authorization independently of the interface, validate origin when `APP_ORIGIN` is set, parse untrusted financial input with Zod, and call transactional database functions. Authentication errors intentionally do not disclose whether an account exists. Authenticated responses are `private, no-store`; the service worker caches only the login shell and public icons.

## Before every push

Run `pnpm check:secrets`, inspect `git status`, `git diff --cached`, and `git ls-files` for `.env`, credentials, tokens, cookies, logs, financial exports, source maps, database dumps, and real financial fixtures. If any credential was ever pushed, revoke or rotate it; deleting it from Git history is not sufficient.

## Production verification checklist

- Run `supabase test db` against an isolated local database.
- Use a second non-owner test identity to directly query every financial table and RPC; every operation must be denied or return zero rows.
- Confirm the owner can access only rows carrying the owner's UUID.
- Confirm logout invalidates browser access and direct API calls.
- Inspect `.next` and browser chunks for service-role keys, owner UUIDs, credentials, or fixture data.
- Run `pnpm audit --prod --audit-level high` and resolve all high/critical findings.
- Verify CSP, HSTS, frame denial, no-store behavior, Supabase redirect allowlist, disabled sign-up, and rate limits.

CI statically verifies the migration and public source. A passing build alone is not a security verification. Database isolation remains unverified until `supabase test db` runs against a real local Supabase instance.
