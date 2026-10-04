$taskDbRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\.local-postgres'))
& 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' -D (Join-Path $taskDbRoot 'data') -l (Join-Path $taskDbRoot 'server.log') -o '-p 54339 -h 127.0.0.1' start
