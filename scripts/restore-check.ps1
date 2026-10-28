[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$BackupDirectory,

  [switch]$EncryptedSourceConfirmed,
  [switch]$AcknowledgeLocalReset
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $EncryptedSourceConfirmed) {
  throw "Refusing to read a financial backup until -EncryptedSourceConfirmed is supplied."
}
if (-not $AcknowledgeLocalReset) {
  throw "Restore verification resets only the local Supabase database. Supply -AcknowledgeLocalReset to continue."
}

$source = (Resolve-Path -LiteralPath $BackupDirectory).Path
$manifestPath = Join-Path $source "manifest.json"
$dataPath = Join-Path $source "data.sql"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ([int]$manifest.format -ne 1) { throw "Unsupported backup manifest format." }

foreach ($property in $manifest.sha256.PSObject.Properties) {
  $file = Join-Path $source $property.Name
  $actual = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
  if ($actual -ne [string]$property.Value) { throw "Checksum mismatch for $($property.Name)." }
}

$dockerVersion = (& docker version --format '{{.Server.Version}}' 2>$null | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($dockerVersion)) {
  throw "A running Docker-compatible container engine is required for isolated restore verification."
}

function Invoke-Supabase {
  param([Parameter(ValueFromRemainingArguments)][string[]]$Arguments)
  & corepack pnpm --silent dlx supabase@2.122.0 @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Supabase CLI command failed." }
}

function Read-QueryRows([string]$Sql) {
  $raw = (Invoke-Supabase db query --local --agent yes --output-format json $Sql 2>&1 | Out-String)
  $jsonStart = $raw.IndexOf('{')
  if ($jsonStart -lt 0) { throw "Local query returned no JSON result." }
  return @(($raw.Substring($jsonStart) | ConvertFrom-Json).rows)
}

$temporaryDataFile = Join-Path $env:TEMP ("saldo-restore-{0}.sql" -f [guid]::NewGuid().ToString("N"))
try {
  $null = (Invoke-Supabase start --agent yes 2>&1 | Out-String)
  $null = (Invoke-Supabase db reset --local --agent yes 2>&1 | Out-String)

  $statusRaw = (Invoke-Supabase status --output env --agent yes 2>&1 | Out-String)
  $apiUrl = [regex]::Match($statusRaw, '(?m)^API_URL="?([^"\r\n]+)').Groups[1].Value
  $serviceKey = [regex]::Match($statusRaw, '(?m)^SERVICE_ROLE_KEY="?([^"\r\n]+)').Groups[1].Value
  if ([string]::IsNullOrWhiteSpace($apiUrl) -or [string]::IsNullOrWhiteSpace($serviceKey)) {
    throw "Local Auth endpoint details are unavailable."
  }

  $restorePassword = [guid]::NewGuid().ToString("N") + [char]33 + [char]65 + [char]57 + [char]35
  $response = Invoke-RestMethod -Method Post -Uri "$apiUrl/auth/v1/admin/users" -Headers @{
    apikey = $serviceKey
    Authorization = "Bearer $serviceKey"
  } -ContentType "application/json" -Body (@{
    email = "saldo-restore-test@example.com"
    password = $restorePassword
    email_confirm = $true
  } | ConvertTo-Json -Compress)

  $oldOwner = [string]$manifest.original_owner_id
  $newOwner = [string]$response.id
  if ($oldOwner -notmatch '^[0-9a-fA-F-]{36}$' -or $newOwner -notmatch '^[0-9a-fA-F-]{36}$') {
    throw "Owner remapping identifiers are invalid."
  }

  $dataSql = [IO.File]::ReadAllText($dataPath).Replace($oldOwner, $newOwner)
  [IO.File]::WriteAllText($temporaryDataFile, $dataSql, [Text.UTF8Encoding]::new($false))
  $null = (Invoke-Supabase db query --local --file $temporaryDataFile --agent yes 2>&1 | Out-String)

  $actualRows = Read-QueryRows @"
select
  (select count(*) from public.accounts)::integer as accounts,
  (select count(*) from public.categories)::integer as categories,
  (select count(*) from public.financial_events)::integer as financial_events,
  (select count(*) from public.ledger_entries)::integer as ledger_entries,
  (select count(*) from public.transfer_details)::integer as transfer_details,
  (select count(*) from public.investment_valuations)::integer as investment_valuations,
  (select count(*) from public.exchange_rates)::integer as exchange_rates,
  (select count(*) from public.user_settings)::integer as user_settings,
  (select count(*) from public.report_snapshots)::integer as report_snapshots,
  (select count(*) from private.owner_allowlist)::integer as owner_allowlist,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity and c.relname in ('accounts','categories','financial_events','ledger_entries','transfer_details','investment_valuations','exchange_rates','user_settings','report_snapshots'))::integer as rls_enabled,
  (select count(*) from pg_policies where schemaname='public' and tablename in ('accounts','categories','financial_events','ledger_entries','transfer_details','investment_valuations','exchange_rates','user_settings','report_snapshots'))::integer as policies
"@

  $actual = $actualRows[0]
  foreach ($name in @('accounts','categories','financial_events','ledger_entries','transfer_details','investment_valuations','exchange_rates','user_settings','report_snapshots')) {
    if ([int]$actual.$name -ne [int]$manifest.row_counts.$name) { throw "Restored row count mismatch for $name." }
  }
  if ([int]$actual.owner_allowlist -ne 1 -or [int]$actual.rls_enabled -ne 9 -or [int]$actual.policies -ne 36) {
    throw "Restored authorization metadata failed verification."
  }

  Invoke-Supabase test db --local --agent yes
  Write-Output "Restore verification passed."
}
finally {
  if (Test-Path -LiteralPath $temporaryDataFile -PathType Leaf) {
    Remove-Item -LiteralPath $temporaryDataFile -Force
  }
  try { Invoke-Supabase stop --agent yes } catch {}
  $serviceKey = $null
  $restorePassword = $null
}
