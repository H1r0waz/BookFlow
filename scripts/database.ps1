param([switch]$Stop)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$clusterPath = Join-Path (Get-Location) '.local\postgres'
if ($Stop) { & pg_ctl -D $clusterPath stop; exit $LASTEXITCODE }
New-Item -ItemType Directory -Force '.local' | Out-Null
if (!(Test-Path $clusterPath)) {
  $randomBytes = New-Object byte[] 24
  $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
  $randomGenerator.GetBytes($randomBytes)
  $randomGenerator.Dispose()
  $localPassword = ([BitConverter]::ToString($randomBytes)).Replace('-', '')
  $passwordPath = Join-Path (Get-Location) '.local\init-password'
  [IO.File]::WriteAllText($passwordPath, $localPassword)
  try { & initdb -D $clusterPath -U bookflow --auth=scram-sha-256 --pwfile=$passwordPath --encoding=UTF8 --locale=C; if ($LASTEXITCODE) { throw 'initdb failed' } }
  finally { Remove-Item -LiteralPath $passwordPath }
  [IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), "DATABASE_URL=postgresql://bookflow:${localPassword}@127.0.0.1:55432/bookflow?schema=public`nAPP_ORIGIN=http://127.0.0.1:5173`nPORT=3001`nNODE_ENV=development`n")
}
& pg_ctl -D $clusterPath status *> $null
if ($LASTEXITCODE) { & pg_ctl -D $clusterPath -l '.local\postgres.log' -o '-h 127.0.0.1 -p 55432' start; if ($LASTEXITCODE) { throw 'PostgreSQL failed to start' } }
$databaseLine = Get-Content '.env' | Where-Object { $_ -like 'DATABASE_URL=*' }
$databaseUri = [Uri]($databaseLine.Substring(13).Split('?')[0])
$env:PGPASSWORD = $databaseUri.UserInfo.Split(':')[1]
try {
  $exists = & psql -h 127.0.0.1 -p 55432 -U bookflow -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='bookflow'"
  if ($exists -ne '1') { & createdb -h 127.0.0.1 -p 55432 -U bookflow bookflow; if ($LASTEXITCODE) { throw 'Database creation failed' } }
} finally { Remove-Item Env:PGPASSWORD }
Write-Output 'BookFlow PostgreSQL is available on 127.0.0.1:55432.'
