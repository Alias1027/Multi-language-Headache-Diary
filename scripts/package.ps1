param([Parameter(Mandatory=$true)][string]$Destination, [string]$Node='node')
$ErrorActionPreference='Stop'
$packageSource=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$packageTarget=[IO.Path]::GetFullPath($Destination)
& $Node (Join-Path $PSScriptRoot 'prepare-release.mjs') $packageTarget
if($LASTEXITCODE -ne 0){throw 'Source preparation failed; no archive created.'}
$packageVersion=(Get-Content -LiteralPath (Join-Path $packageSource 'package.json') -Raw | ConvertFrom-Json).version
$packageZip=Join-Path $packageTarget "headache-diary-source-$packageVersion.zip"
# Explicit .NET entries preserve dotfiles on Windows and Linux.
Add-Type -AssemblyName System.IO.Compression
$packageStream=[IO.File]::Open($packageZip,[IO.FileMode]::CreateNew)
$packageArchive=[IO.Compression.ZipArchive]::new($packageStream,[IO.Compression.ZipArchiveMode]::Create)
try {
 foreach($packageFile in (Get-ChildItem -LiteralPath (Join-Path $packageTarget 'project') -File -Recurse -Force | Sort-Object FullName)){
  $packageName=$packageFile.FullName.Substring($packageTarget.Length+1).Replace('\','/')
  $packageEntry=$packageArchive.CreateEntry($packageName,[IO.Compression.CompressionLevel]::Optimal)
  $packageInput=[IO.File]::OpenRead($packageFile.FullName);$packageOutput=$packageEntry.Open()
  try{$packageInput.CopyTo($packageOutput)}finally{$packageInput.Dispose();$packageOutput.Dispose()}
 }
} finally {$packageArchive.Dispose();$packageStream.Dispose()}
$packageHashes=Get-ChildItem -LiteralPath $packageTarget -File -Recurse -Force | Sort-Object FullName | ForEach-Object {
 (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()+'  '+$_.FullName.Substring($packageTarget.Length+1).Replace('\','/')
}
Set-Content -LiteralPath (Join-Path $packageTarget 'SHA256SUMS.txt') -Value $packageHashes -Encoding utf8
& $Node (Join-Path $PSScriptRoot 'verify-manifest.mjs') $packageTarget
if($LASTEXITCODE -ne 0){throw 'Package integrity check failed.'}
Write-Host "Source package ready: $packageZip"
