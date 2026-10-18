param([Parameter(Mandatory=$true)][string]$Bundle, [Parameter(Mandatory=$true)][string]$EvidenceDirectory)
$ErrorActionPreference='Stop'
$bundleRoot=[IO.Path]::GetFullPath($Bundle)
$dataRoot=Join-Path $bundleRoot 'data'
if (Test-Path -LiteralPath $dataRoot) { throw 'Use a freshly extracted disposable bundle. Existing data is never tested or removed.' }
New-Item -ItemType Directory -Force -Path $EvidenceDirectory | Out-Null
$results=[Collections.Generic.List[object]]::new()
function Check([string]$name,[bool]$condition) {
  if (!$condition) { throw "FAILED: $name" }
  $results.Add([pscustomobject]@{name=$name;passed=$true})
  Write-Host "PASS: $name"
}
function Free-Port {
  $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
  try { $listener.Start(); return $listener.LocalEndpoint.Port } finally { $listener.Stop() }
}
$port=Free-Port
$start=Join-Path $bundleRoot 'Start.cmd'; $stop=Join-Path $bundleRoot 'Stop.cmd'
$pidFile=Join-Path $dataRoot 'server.pid'
$ownedRecord=$null
try {
  & $start -Port $port -NoBrowser
  Check 'Start.cmd creates a healthy service from a clean bundle' ($LASTEXITCODE -eq 0)
  $ownedRecord=Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
  $firstId=$ownedRecord.id
  Check 'PID record binds this bundle and requested port' ($ownedRecord.server -eq (Join-Path $bundleRoot 'project\server\main.mjs') -and $ownedRecord.port -eq $port)
  & $start -Port $port -NoBrowser
  Check 'Repeated startup reuses the same process' ($LASTEXITCODE -eq 0 -and (Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json).id -eq $firstId)
  $ErrorActionPreference='Continue'
  & $start -Port (Free-Port) -NoBrowser 2>&1 | Out-File -LiteralPath (Join-Path $EvidenceDirectory 'different-port.txt')
  $ErrorActionPreference='Stop'
  Check 'A running copy rejects a different requested port' ($LASTEXITCODE -ne 0 -and !!(Get-Process -Id $firstId -ErrorAction SilentlyContinue))
  $forged=$ownedRecord | ConvertTo-Json | ConvertFrom-Json
  $forged.started='1'
  $forged | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
  $ErrorActionPreference='Continue'
  & $stop --no-pause 2>&1 | Out-File -LiteralPath (Join-Path $EvidenceDirectory 'wrong-start-time.txt')
  $ErrorActionPreference='Stop'
  Check 'Stop rejects a PID with mismatched start time' ($LASTEXITCODE -ne 0 -and !!(Get-Process -Id $firstId -ErrorAction SilentlyContinue))
  $forged=$ownedRecord | ConvertTo-Json | ConvertFrom-Json
  $forged.server=Join-Path $bundleRoot 'another-server.mjs'
  $forged | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
  $ErrorActionPreference='Continue'
  & $stop --no-pause 2>&1 | Out-File -LiteralPath (Join-Path $EvidenceDirectory 'wrong-server-path.txt')
  $ErrorActionPreference='Stop'
  Check 'Stop rejects another server path' ($LASTEXITCODE -ne 0 -and !!(Get-Process -Id $firstId -ErrorAction SilentlyContinue))
  $ownedRecord | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
  Set-Content -LiteralPath (Join-Path $dataRoot 'preservation-sentinel.txt') -Value 'Synthetic launcher test. Preserve across restart.' -Encoding UTF8
  & $stop --no-pause
  Check 'Stop.cmd stops only the recorded process and removes its PID file' ($LASTEXITCODE -eq 0 -and !(Test-Path -LiteralPath $pidFile) -and !(Get-Process -Id $firstId -ErrorAction SilentlyContinue))
  $node=Join-Path $bundleRoot 'runtime\node.exe'
  $stateScript=Join-Path $PSScriptRoot 'portable-data-state.mjs'
  $before=& $node --disable-warning=ExperimentalWarning $stateScript $dataRoot
  Check 'SQLite integrity is valid after first stop' ($LASTEXITCODE -eq 0)
  $before | Set-Content -LiteralPath (Join-Path $EvidenceDirectory 'data-before.json') -Encoding UTF8
  & $start -Port $port -NoBrowser
  Check 'Restart succeeds with existing local data' ($LASTEXITCODE -eq 0)
  $ownedRecord=Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
  & $stop --no-pause
  Check 'Second stop succeeds' ($LASTEXITCODE -eq 0)
  $after=& $node --disable-warning=ExperimentalWarning $stateScript $dataRoot
  Check 'SQLite integrity is valid after restart and second stop' ($LASTEXITCODE -eq 0)
  $after | Set-Content -LiteralPath (Join-Path $EvidenceDirectory 'data-after.json') -Encoding UTF8
  Check 'Restart preserves all table rows, key bytes and test marker' ($before -ceq $after)
  $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
  try {
    $listener.ExclusiveAddressUse=$true; $listener.Start(); $occupied=$listener.LocalEndpoint.Port
    $ErrorActionPreference='Continue'
    & $start -Port $occupied -NoBrowser 2>&1 | Out-File -LiteralPath (Join-Path $EvidenceDirectory 'occupied-port.txt')
    $ErrorActionPreference='Stop'
    Check 'Any occupied TCP port is rejected without creating a server PID' ($LASTEXITCODE -ne 0 -and !(Test-Path -LiteralPath $pidFile))
    Check 'Unrelated TCP listener remains running' ($listener.Server.IsBound)
  } finally { $listener.Stop() }
  & $stop --no-pause
  Check 'Stopping an already stopped copy is harmless' ($LASTEXITCODE -eq 0)
  $startupArguments='-NoProfile -ExecutionPolicy Bypass -File "'+(Join-Path $bundleRoot 'Start.ps1')+'" -Port '+$port+' -NoBrowser'
  $launches=@(1,2 | ForEach-Object {
    $launch=Start-Process -FilePath 'powershell.exe' -ArgumentList $startupArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $EvidenceDirectory "concurrent-start-$_.txt") -RedirectStandardError (Join-Path $EvidenceDirectory "concurrent-start-$_-error.txt")
    $null=$launch.Handle # Retain the native handle so Windows PowerShell 5.1 can read ExitCode after exit.
    $launch
  })
  foreach ($launch in $launches) { if (!$launch.WaitForExit(45000)) { throw 'Concurrent launcher timed out.' }; $launch.Refresh() }
  $ownedRecord=Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
  Check 'Two simultaneous launchers both succeed' (@($launches | Where-Object {$_.ExitCode -ne 0}).Count -eq 0)
  $ownCommand='^"?'+[regex]::Escape((Join-Path $bundleRoot 'runtime\node.exe'))+'"?\s+"'+[regex]::Escape((Join-Path $bundleRoot 'project\server\main.mjs'))+'"\s*$'
  $servers=@(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object {$_.CommandLine -match $ownCommand})
  Check 'Concurrent startup leaves exactly one owned server' ($servers.Count -eq 1 -and $servers[0].ProcessId -eq $ownedRecord.id)
  $ownedRecord.PSObject.Properties.Remove('port')
  $ownedRecord | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
  & $stop --no-pause
  Check 'Stop accepts legacy PID records without a port field' ($LASTEXITCODE -eq 0 -and !(Get-Process -Id $ownedRecord.id -ErrorAction SilentlyContinue))
  [pscustomobject]@{version='0.6.1';bundle=$bundleRoot;port=$port;checks=$results.Count;passed=$true;results=@($results.ToArray())} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $EvidenceDirectory 'launcher-checks.json') -Encoding UTF8
} finally {
  if ($ownedRecord -and (Get-Process -Id $ownedRecord.id -ErrorAction SilentlyContinue)) {
    $ownedRecord | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding UTF8
    & $stop --no-pause
  }
}
