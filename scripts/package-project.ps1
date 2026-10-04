$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$archiveName = 'CWrite-Lite-' + (Get-Date -Format 'yyyy-MM-dd') + '.zip'
$archivePath = Join-Path $projectRoot $archiveName
if (Test-Path -LiteralPath $archivePath) {
    $archiveName = 'CWrite-Lite-' + (Get-Date -Format 'yyyy-MM-dd-HHmmss') + '.zip'
    $archivePath = Join-Path $projectRoot $archiveName
}
$sourceDirectories = @('app', 'components', 'hooks', 'lib', 'prisma', 'public', 'scripts', 'docs')
$rootFiles = @('.env.example', '.gitignore', 'README.md', 'package.json', 'package-lock.json', 'next-env.d.ts', 'next.config.mjs', 'postcss.config.mjs', 'tsconfig.json', 'vercel.json')
$files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
foreach ($directory in $sourceDirectories) {
    Get-ChildItem -LiteralPath (Join-Path $projectRoot $directory) -Recurse -File -Force |
        Where-Object { $_.FullName -notmatch '[\\/]generated[\\/]' -and $_.Name -notmatch '^\.env(\.|$)' } |
        ForEach-Object { $files.Add($_) }
}
foreach ($name in $rootFiles) { $files.Add((Get-Item -LiteralPath (Join-Path $projectRoot $name) -Force)) }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream = [System.IO.File]::Open($archivePath, [System.IO.FileMode]::CreateNew)
$zip = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files) {
        $relative = [System.IO.Path]::GetRelativePath($projectRoot, $file.FullName).Replace('\', '/')
        $entryName = 'CWrite-Lite/' + $relative
        $level = if ($file.Extension -match '^\.(webp|png|jpg|jpeg|gif|mp3|mp4|ogg|woff2)$') { [System.IO.Compression.CompressionLevel]::NoCompression } else { [System.IO.Compression.CompressionLevel]::Optimal }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName, $level) | Out-Null
    }
} finally { $zip.Dispose(); $stream.Dispose() }
$check = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
    $names = @($check.Entries | ForEach-Object { $_.FullName })
    foreach ($required in @('package.json', '.env.example', 'public/logo-white.webp', 'prisma/schema.prisma', 'docs/AI_API_AND_VERCEL_SETUP.md', 'lib/ark-video-config.ts')) {
        if ($names -notcontains ('CWrite-Lite/' + $required)) { throw "Missing required project file: $required" }
    }
    if ($names | Where-Object { $_ -match '/(node_modules|\.next|\.local-postgres|\.tool-cache)/|/\.env$' }) { throw 'Unexpected local-only data in source archive.' }
    Write-Output ("Verified archive: {0}; {1} files; {2:N1} MB" -f $archivePath, $names.Count, ((Get-Item -LiteralPath $archivePath).Length / 1MB))
} finally { $check.Dispose() }
