param(
 [Parameter(Mandatory=$true)][string]$OutputDirectory,
 [string]$ArchivePath
)
$ErrorActionPreference = 'Stop'
$toolchain = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'android-ci-toolchain.json') -Raw | ConvertFrom-Json
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$relative = [IO.Path]::GetRelativePath($sourceRoot, $OutputDirectory)
if ($relative -eq '.' -or (!$relative.StartsWith('..'+[IO.Path]::DirectorySeparatorChar) -and ![IO.Path]::IsPathRooted($relative))) {
 throw 'CI tools must be outside the source directory.'
}
if (Test-Path -LiteralPath $OutputDirectory) {
 if ((Get-ChildItem -LiteralPath $OutputDirectory -Force | Measure-Object).Count) { throw 'CI tool output must be new or empty.' }
} else { New-Item -ItemType Directory -Path $OutputDirectory | Out-Null }
$downloaded = !$ArchivePath
if ($downloaded) {
 $ArchivePath = Join-Path $OutputDirectory ('gradle-'+$toolchain.gradleVersion+'-bin.zip')
 Invoke-WebRequest -Uri ('https://services.gradle.org/distributions/gradle-'+$toolchain.gradleVersion+'-bin.zip') -OutFile $ArchivePath -TimeoutSec 600
} else { $ArchivePath = [IO.Path]::GetFullPath($ArchivePath) }
$actual = (Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $toolchain.gradleSha256) { throw 'Gradle SHA-256 mismatch; archive was not extracted or executed.' }
Expand-Archive -LiteralPath $ArchivePath -DestinationPath $OutputDirectory
$launcher = Join-Path $OutputDirectory ('gradle-'+$toolchain.gradleVersion+'/bin/gradle'+$(if($IsWindows){'.bat'}else{''}))
if (!(Test-Path -LiteralPath $launcher -PathType Leaf)) { throw 'Verified Gradle archive has no launcher.' }
if (!$IsWindows) {
 & chmod '+x' $launcher
 if ($LASTEXITCODE -ne 0) { throw 'Cannot mark the verified Gradle launcher executable.' }
}
if ($downloaded) { Remove-Item -LiteralPath $ArchivePath }
Write-Output $launcher
