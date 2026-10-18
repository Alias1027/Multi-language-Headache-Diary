param(
  [Parameter(Mandatory=$true)][string]$Destination,
  [Parameter(Mandatory=$true)][string]$Resources,
  [Parameter(Mandatory=$true)][string]$Runtime
)
$ErrorActionPreference='Stop'
$source=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$target=[IO.Path]::GetFullPath($Destination)
$resourcesRoot=[IO.Path]::GetFullPath($Resources)
$runtimeRoot=[IO.Path]::GetFullPath($Runtime)
foreach ($inputRoot in @($source,$resourcesRoot,$runtimeRoot)) {
  if ($target -eq $inputRoot -or $target.StartsWith($inputRoot.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Destination must be outside every input directory.' }
}
if ((Test-Path -LiteralPath $target) -and @(Get-ChildItem -LiteralPath $target -Force).Count) { throw 'Destination must be empty.' }
$node=Join-Path $runtimeRoot 'node.exe'
$license=Join-Path $runtimeRoot 'LICENSE-node.txt'
if (!(Test-Path -LiteralPath $node) -or !(Test-Path -LiteralPath $license)) { throw 'Runtime must contain node.exe and LICENSE-node.txt.' }
$runtimeInfo=(& $node -p 'JSON.stringify({version:process.version,platform:process.platform,arch:process.arch})') | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $runtimeInfo.platform -ne 'win32' -or $runtimeInfo.arch -ne 'x64' -or $runtimeInfo.version -notmatch '^v24\.') { throw 'A Windows x64 Node.js 24 runtime is required.' }
# This bundled version was checked against the official Node.js release manifest.
$verifiedRuntimeVersion='v24.19.0'
$verifiedRuntimeHash='3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237'
# https://nodejs.org/dist/v24.19.0/SHASUMS256.txt (win-x64/node.exe)
if ($runtimeInfo.version -ne $verifiedRuntimeVersion -or (Get-FileHash -LiteralPath $node -Algorithm SHA256).Hash.ToLower() -ne $verifiedRuntimeHash) { throw 'Runtime is not the verified release. Verify its official checksum and update this allowlist before packaging.' }
$version=(Get-Content -LiteralPath (Join-Path $source 'package.json') -Raw | ConvertFrom-Json).version
$bundleName="headache-diary-windows-x64-$version"
$bundle=Join-Path $target $bundleName
$guideName='开始使用'
$resourceFiles=@('Start.ps1','Start.cmd','Stop.ps1','Stop.cmd','Test.cmd','使用说明.html')
foreach ($name in $resourceFiles) { if (!(Test-Path -LiteralPath (Join-Path $resourcesRoot $name) -PathType Leaf)) { throw "Missing portable resource: $name" } }
$guideRoot=Join-Path $resourcesRoot $guideName
if (!(Test-Path -LiteralPath $guideRoot -PathType Container)) { throw 'Missing getting-started guide.' }
$guideFiles=@(Get-ChildItem -LiteralPath $guideRoot -Recurse -Force)
foreach ($item in $guideFiles) {
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Guide symlinks or junctions are not allowed.' }
  if (!$item.PSIsContainer -and $item.Extension -notin @('.html','.css','.cmd')) { throw "Unexpected guide resource: $($item.Name)" }
}
foreach ($path in @($node,$license,$guideRoot)+@($resourceFiles | ForEach-Object { Join-Path $resourcesRoot $_ })) {
  if ((Get-Item -LiteralPath $path -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Input symlinks or junctions are not allowed.' }
}
& $node (Join-Path $PSScriptRoot 'prepare-release.mjs') $bundle
if ($LASTEXITCODE -ne 0) { throw 'Source whitelist check failed.' }
New-Item -ItemType Directory -Path (Join-Path $bundle 'runtime') | Out-Null
Copy-Item -LiteralPath $node,$license -Destination (Join-Path $bundle 'runtime')
foreach ($name in $resourceFiles) { Copy-Item -LiteralPath (Join-Path $resourcesRoot $name) -Destination (Join-Path $bundle $name) }
Copy-Item -LiteralPath $guideRoot -Destination (Join-Path $bundle $guideName) -Recurse
$bundleFiles=@(Get-ChildItem -LiteralPath $bundle -Recurse -File -Force | Sort-Object FullName)
$hashes=$bundleFiles | ForEach-Object { (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()+'  '+$_.FullName.Substring($bundle.Length+1).Replace('\','/') }
Set-Content -LiteralPath (Join-Path $bundle 'SHA256SUMS.txt') -Value $hashes -Encoding UTF8
& $node (Join-Path $PSScriptRoot 'verify-manifest.mjs') $bundle
if ($LASTEXITCODE -ne 0) { throw 'Portable manifest verification failed.' }
$zipPath=Join-Path $target ($bundleName+'.zip')
Add-Type -AssemblyName System.IO.Compression
$stream=[IO.File]::Open($zipPath,[IO.FileMode]::CreateNew)
$archive=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in (Get-ChildItem -LiteralPath $bundle -Recurse -File -Force | Sort-Object FullName)) {
    $name=$bundleName+'/'+$file.FullName.Substring($bundle.Length+1).Replace('\','/')
    $entry=$archive.CreateEntry($name,[IO.Compression.CompressionLevel]::Optimal)
    $input=[IO.File]::OpenRead($file.FullName); $output=$entry.Open()
    try { $input.CopyTo($output) } finally { $input.Dispose(); $output.Dispose() }
  }
} finally { $archive.Dispose(); $stream.Dispose() }
$zipHash=(Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLower()
Set-Content -LiteralPath (Join-Path $target 'SHA256SUMS.txt') -Value ($zipHash+'  '+[IO.Path]::GetFileName($zipPath)) -Encoding UTF8
[pscustomobject]@{version=$version;runtime=$runtimeInfo;runtimeSHA256=$verifiedRuntimeHash;files=$bundleFiles.Count;bundle=$bundle;archive=$zipPath;archiveSHA256=$zipHash;bytes=(Get-Item -LiteralPath $zipPath).Length} | ConvertTo-Json -Depth 4
