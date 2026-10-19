# Backup and recovery

Supabase synchronization is not a backup. Check the selected Supabase plan's current backup and point-in-time recovery features before relying on them.

## Backup

1. Enable the platform's automatic database backups if the plan supports them and record the verified retention period outside this repository.
2. At least monthly, create a user-controlled logical backup from a trusted computer with Supabase CLI/PostgreSQL tools. Store it in an encrypted local volume and an encrypted second location. Never place it in the Git repository or a public cloud folder.
3. Keep schema migrations in source control separately from data backups.
4. After each schema change, take a fresh backup before applying the migration in production.

Example (run interactively; never paste the database password into shell history):

```powershell
supabase db dump --linked --data-only -f .\backups\finance-data.sql
supabase db dump --linked -f .\backups\finance-schema.sql
```

The local `backups/` directory is ignored by Git. Encrypt and move the files promptly. Logical dumps contain financial information and owner identifiers even though they do not contain the Supabase user's password.

## Recovery test

Quarterly, create an isolated Supabase project or local stack, apply the exact migration set, restore the most recent backup, and verify row counts, account balances reconstructed from ledger entries, transfer pairs, latest investment valuations, and owner-only RLS with a second identity. Record the date and result outside the public repository. Never test recovery by overwriting production.

For an actual incident: stop writes, preserve the damaged database, identify the last known-good recovery point, restore into an isolated environment, run reconciliation and authorization tests, then switch production only after review. Rotate credentials if compromise is suspected.
