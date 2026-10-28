# Backup and recovery

Supabase synchronization is not a backup. The Supabase Free plan does not include automatic database backups or point-in-time recovery, so this application's zero-cost recovery plan depends on user-controlled logical exports.

## Backup

1. After every material data-entry session, at least weekly, before every schema change, and before entering a large batch of data, create a user-controlled logical backup from a trusted computer.
2. Store one copy on a BitLocker-encrypted Windows volume and one copy on a separate encrypted USB drive kept offline. This requires no subscription. Never place a dump in GitHub, Vercel, an unencrypted cloud folder, or an Actions artifact.
3. Keep schema migrations in source control separately from data backups.
4. Record the backup date, SHA-256 checksum, and most recent successful restore-test date outside this repository. A backup that has never been restored is not verified.

The repository provides a guarded backup command. The destination must be outside the repository on a BitLocker-encrypted volume or encrypted offline USB drive. The script refuses to run without an explicit encryption acknowledgement:

```powershell
.\scripts\backup.ps1 -Destination 'E:\SALDO backups' -EncryptedDestinationConfirmed
```

The backup contains schema, application data, migration history, role metadata, exact row counts, the single owner identifier used for recovery remapping, and SHA-256 checksums. It does not contain the owner's plaintext password. Treat the complete directory as sensitive financial data. Never place it in GitHub, Vercel, an Actions artifact, email, or an unencrypted cloud folder.

## Recovery test

Quarterly, verify the latest backup in an isolated local Supabase stack. This requires a running free Docker-compatible container engine and intentionally resets only the local Supabase database:

```powershell
.\scripts\restore-check.ps1 -BackupDirectory 'E:\SALDO backups\saldo-YYYYMMDD-HHMMSS' -EncryptedSourceConfirmed -AcknowledgeLocalReset
```

The restore check verifies every checksum, creates a disposable local Auth owner, remaps the single backed-up owner identifier only in a temporary copy, restores data locally, compares all nine table counts, confirms one allowlist owner, verifies 9 RLS-enabled tables and 36 policies, and runs the pgTAP database tests. It never connects the restored data to production and removes the temporary transformed SQL file afterward. Record the backup date and successful restore-test date outside the public repository.

Supabase Free does not include automatic backups or point-in-time recovery. Do not enable PITR or paid branching. The zero-cost plan is the encrypted logical export plus a second encrypted offline copy and periodic local restore verification.

For an actual incident: stop writes, preserve the damaged database, identify the last known-good recovery point, restore into an isolated environment, run reconciliation and authorization tests, then switch production only after review. Rotate credentials if compromise is suspected.
