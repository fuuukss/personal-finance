# Backup and recovery

Supabase synchronization is not a backup. The Supabase Free plan does not include automatic database backups or point-in-time recovery, so this application's zero-cost recovery plan depends on user-controlled logical exports.

## Backup

1. At least monthly, and before every schema change, create a user-controlled logical backup from a trusted computer with Supabase CLI/PostgreSQL tools.
2. Store one copy on a BitLocker-encrypted Windows volume and one copy on a separate encrypted USB drive kept offline. This requires no subscription. Never place a dump in GitHub, Vercel, an unencrypted cloud folder, or an Actions artifact.
3. Keep schema migrations in source control separately from data backups.
4. Record the backup date, SHA-256 checksum, and most recent successful restore-test date outside this repository. A backup that has never been restored is not verified.

Example (run interactively; never paste the database password into shell history):

```powershell
supabase db dump --linked --data-only -f .\backups\finance-data.sql
supabase db dump --linked -f .\backups\finance-schema.sql
Get-FileHash -Algorithm SHA256 .\backups\finance-data.sql, .\backups\finance-schema.sql
```

The local `backups/` directory is ignored by Git. Create it only on an encrypted volume, then copy the files to the encrypted offline location. Logical dumps contain financial information and owner identifiers even though they do not contain the Supabase user's password.

## Recovery test

Quarterly, create an isolated Supabase project or local stack, apply the exact migration set, restore the most recent backup, and verify row counts, account balances reconstructed from ledger entries, transfer pairs, latest investment valuations, and owner-only RLS with a second identity. Record the date and result outside the public repository. Never test recovery by overwriting production.

For an actual incident: stop writes, preserve the damaged database, identify the last known-good recovery point, restore into an isolated environment, run reconciliation and authorization tests, then switch production only after review. Rotate credentials if compromise is suspected.
