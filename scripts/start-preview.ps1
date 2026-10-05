$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $taskRoot
$taskDb = Join-Path $taskRoot '.tool-cache\video-test-db'
$taskPgBin = 'C:\Program Files\PostgreSQL\17\bin'
if (!(Test-Path -LiteralPath (Join-Path $taskPgBin 'pg_ctl.exe'))) { throw 'Install PostgreSQL 17, or update taskPgBin in this script to your PostgreSQL bin folder.' }
if (!(Test-Path -LiteralPath 'node_modules\next')) { & npm.cmd ci --legacy-peer-deps; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
if (!(Test-Path -LiteralPath (Join-Path $taskDb 'PG_VERSION'))) {
    New-Item -ItemType Directory -Path (Join-Path $taskRoot '.tool-cache') -Force | Out-Null
    & (Join-Path $taskPgBin 'initdb.exe') -D $taskDb -U cwrite_test --auth=trust --encoding=UTF8 --locale=C
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
& (Join-Path $taskPgBin 'pg_ctl.exe') -D $taskDb status *> $null
if ($LASTEXITCODE -ne 0) {
    $taskProcess = Start-Process -FilePath (Join-Path $taskPgBin 'pg_ctl.exe') -ArgumentList @('-D', ('"'+$taskDb+'"'), '-l', ('"'+(Join-Path $taskDb 'server.log')+'"'), '-o', '"-p 54348 -h 127.0.0.1"', '-w', 'start') -WindowStyle Hidden -PassThru
    $taskProcess.WaitForExit()
    if ($taskProcess.ExitCode -ne 0) { throw 'Preview database could not start. Check port 54348 and the database server log.' }
}
$taskEnv = Join-Path $taskRoot '.env.local'
$taskText = if (Test-Path -LiteralPath $taskEnv) { [IO.File]::ReadAllText($taskEnv) } else { '' }
$taskExistingDb = [regex]::Match($taskText, '(?m)^DATABASE_URL=(.+)$').Groups[1].Value.Trim('"',"'",' ')
if ($taskExistingDb -and $taskExistingDb -ne 'postgresql://cwrite_test@127.0.0.1:54348/postgres') { throw 'An existing database configuration was found. Leaving it untouched. Use a separate copy for this local preview.' }
$taskText = $taskText -replace '(?m)^(DATABASE_URL|CWRITE_LOCAL_PREVIEW|CWRITE_LOCAL_MOCK_IMAGES)=.*\r?\n?', ''
$taskText += "`nDATABASE_URL=postgresql://cwrite_test@127.0.0.1:54348/postgres`nCWRITE_LOCAL_PREVIEW=true`nCWRITE_LOCAL_MOCK_IMAGES=true`n"
[IO.File]::WriteAllText($taskEnv, $taskText, [Text.UTF8Encoding]::new($false))
$env:DATABASE_URL = 'postgresql://cwrite_test@127.0.0.1:54348/postgres'
$env:CWRITE_LOCAL_PREVIEW = 'true'
$env:CWRITE_LOCAL_MOCK_IMAGES = 'true'
& npx.cmd prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& npx.cmd prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& node.exe scripts/seed-local-preview.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Open http://127.0.0.1:3010 — Tony / 123321 — local preview, no paid AI'
& npm.cmd run dev -- -H 127.0.0.1
