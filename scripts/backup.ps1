[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$Destination,

  [switch]$EncryptedDestinationConfirmed
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $EncryptedDestinationConfirmed) {
  throw "Refusing to create a financial backup until -EncryptedDestinationConfirmed is supplied."
}

$repoRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$destinationRoot = [IO.Path]::GetFullPath($Destination)
$repoPrefix = $repoRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
if ($destinationRoot.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase) -or
    $destinationRoot.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Backups must be stored outside the Git repository on an encrypted destination."
}

$dockerVersion = (& docker version --format '{{.Server.Version}}' 2>$null | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($dockerVersion)) {
  throw "A running Docker-compatible container engine is required by supabase db dump."
}

if (-not (Test-Path -LiteralPath $destinationRoot -PathType Container)) {
  $null = New-Item -ItemType Directory -Path $destinationRoot
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDirectory = Join-Path $destinationRoot "saldo-$stamp"
$null = New-Item -ItemType Directory -Path $backupDirectory

function Invoke-Supabase {
  param([Parameter(ValueFromRemainingArguments)][string[]]$Arguments)
  & corepack pnpm --silent dlx supabase@2.122.0 @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Supabase CLI command failed." }
}

function Read-QueryRows([string]$Sql) {
  $raw = (Invoke-Supabase db query --linked --agent yes --output-format json $Sql 2>&1 | Out-String)
  $jsonStart = $raw.IndexOf('{')
  if ($jsonStart -lt 0) { throw "Supabase query returned no JSON result." }
  return @(($raw.Substring($jsonStart) | ConvertFrom-Json).rows)
}

$schemaFile = Join-Path $backupDirectory "schema.sql"
$dataFile = Join-Path $backupDirectory "data.sql"
$rolesFile = Join-Path $backupDirectory "roles.sql"
$historySchemaFile = Join-Path $backupDirectory "migration-history-schema.sql"
$historyDataFile = Join-Path $backupDirectory "migration-history-data.sql"

Invoke-Supabase db dump --linked --schema "public,private" --file $schemaFile --agent yes
Invoke-Supabase db dump --linked --schema "public,private" --data-only --use-copy --file $dataFile --agent yes
Invoke-Supabase db dump --linked --role-only --file $rolesFile --agent yes
Invoke-Supabase db dump --linked --schema "supabase_migrations" --file $historySchemaFile --agent yes
Invoke-Supabase db dump --linked --schema "supabase_migrations" --data-only --use-copy --file $historyDataFile --agent yes

$ownerRows = Read-QueryRows "select user_id::text as original_owner_id from private.owner_allowlist"
if ($ownerRows.Count -ne 1) { throw "Backup requires exactly one owner allowlist entry." }

$countRows = Read-QueryRows @"
select
  (select count(*) from public.accounts)::integer as accounts,
  (select count(*) from public.categories)::integer as categories,
  (select count(*) from public.financial_events)::integer as financial_events,
  (select count(*) from public.ledger_entries)::integer as ledger_entries,
  (select count(*) from public.transfer_details)::integer as transfer_details,
  (select count(*) from public.investment_valuations)::integer as investment_valuations,
  (select count(*) from public.exchange_rates)::integer as exchange_rates,
  (select count(*) from public.user_settings)::integer as user_settings,
  (select count(*) from public.report_snapshots)::integer as report_snapshots
"@

$files = @($schemaFile, $dataFile, $rolesFile, $historySchemaFile, $historyDataFile)
$checksums = [ordered]@{}
foreach ($file in $files) {
  $checksums[(Split-Path -Leaf $file)] = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
}

$manifest = [ordered]@{
  format = 1
  created_at_utc = (Get-Date).ToUniversalTime().ToString("o")
  git_commit = (& git -C $repoRoot rev-parse HEAD).Trim()
  supabase_cli = "2.122.0"
  original_owner_id = [string]$ownerRows[0].original_owner_id
  row_counts = $countRows[0]
  sha256 = $checksums
  note = "Contains sensitive financial data and an owner identifier. Keep only on encrypted storage."
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $backupDirectory "manifest.json") -Encoding utf8NoBOM

Write-Output $backupDirectory
