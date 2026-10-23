param(
 [Parameter(Mandatory=$true)][string]$GradlePath,
 [Parameter(Mandatory=$true)][string]$SdkDirectory,
 [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
if ($env:HD_ANDROID_KEYSTORE -or $env:HD_ANDROID_STORE_PASSWORD) { throw 'CI debug builds must not receive release signing credentials.' }
$sourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$relative = [IO.Path]::GetRelativePath($sourceRoot, $OutputDirectory)
if ($relative -eq '.' -or (!$relative.StartsWith('..'+[IO.Path]::DirectorySeparatorChar) -and ![IO.Path]::IsPathRooted($relative))) {
 throw 'CI build output must be outside the source directory.'
}
$GradlePath = [IO.Path]::GetFullPath($GradlePath)
$SdkDirectory = [IO.Path]::GetFullPath($SdkDirectory)
$toolchain = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'android-ci-toolchain.json') -Raw | ConvertFrom-Json
if (!(Test-Path -LiteralPath $GradlePath -PathType Leaf)) { throw 'Install checksum-verified Gradle with install-android-ci-gradle.ps1 first.' }
$javaOutput = (& java -version 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -or $javaOutput -notmatch ('version "'+$toolchain.javaMajor+'\.')) { throw 'CI Android build requires Java 21.' }
foreach ($package in @(('platforms/android-'+$toolchain.compileSdk), ('build-tools/'+$toolchain.buildTools))) {
 if (!(Test-Path -LiteralPath (Join-Path $SdkDirectory ($package+'/source.properties')))) { throw "Required Android SDK package is missing: $package" }
}
$gradleOutput = (& $GradlePath --version 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -or $gradleOutput -notmatch ('(?m)^Gradle '+[regex]::Escape($toolchain.gradleVersion)+'\s*$')) { throw 'Gradle version differs from the checked CI toolchain.' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$env:ANDROID_HOME = $SdkDirectory
$env:ANDROID_USER_HOME = Join-Path $OutputDirectory 'android-user'
if (!$env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME = Join-Path $OutputDirectory 'gradle-user' }
$buildRoot = Join-Path $OutputDirectory 'build-cache'
Push-Location (Join-Path $sourceRoot 'android')
try {
 & $GradlePath --no-daemon --console=plain --project-cache-dir (Join-Path $OutputDirectory 'project-cache') "-PbuildRoot=$buildRoot" :app:assembleDebug
 if ($LASTEXITCODE -ne 0) { throw 'Android CI debug compilation failed.' }
} finally { Pop-Location }
$artifact = Join-Path $OutputDirectory 'artifact'
if (Test-Path -LiteralPath $artifact) { throw 'CI artifact directory already exists; use a fresh output directory.' }
New-Item -ItemType Directory -Path $artifact | Out-Null
$apk = Join-Path $artifact 'headache-diary-ci-debug-NOT-FOR-DISTRIBUTION.apk'
Copy-Item -LiteralPath (Join-Path $buildRoot 'app/outputs/apk/debug/app-debug.apk') -Destination $apk
$hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
($hash+'  '+[IO.Path]::GetFileName($apk)) | Set-Content -LiteralPath (Join-Path $artifact 'SHA256SUMS.txt') -Encoding ascii
$package = Get-Content -LiteralPath (Join-Path $sourceRoot 'package.json') -Raw | ConvertFrom-Json
@{
 purpose='Compilation evidence only. Not a signed distribution release or physical-device acceptance.'
 webVersion=$package.version; sourceCommit=$env:GITHUB_SHA; variant='debug'; java=$javaOutput.Trim()
 gradle=$toolchain.gradleVersion; gradleDistributionSha256=$toolchain.gradleSha256
 compileSdk=$toolchain.compileSdk; buildTools=$toolchain.buildTools; apkSha256=$hash
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $artifact 'BUILD-INFO.json') -Encoding utf8
@'
CI DEBUG ARTIFACT - NOT FOR DISTRIBUTION
This APK uses a disposable Android debug key and a separate .preview application ID.
It proves compilation only. It is not the maintainer-signed prerelease APK, an update
to an installed prerelease, a real-device acceptance result, or clinical validation.
Do not use real patient data. Download patient preview builds from the official Release.

CI 调试附件，仅用于编译核验，不用于分发。
该 APK 使用临时调试签名及独立 .preview 应用标识，不是正式签名的预发布安装包，
不能作为既有预发布版的升级包，也不代表真机验收或临床验证通过。仅使用合成数据。
'@ | Set-Content -LiteralPath (Join-Path $artifact 'README.txt') -Encoding utf8
Write-Host "CI debug artifact: $artifact"
