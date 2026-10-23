param(
 [Parameter(Mandatory=$true)][string]$ToolRoot,
 [Parameter(Mandatory=$true)][string]$OutputDirectory,
 [switch]$DebugBuild
)
$ErrorActionPreference='Stop'
$ToolRoot=[IO.Path]::GetFullPath($ToolRoot)
$OutputDirectory=[IO.Path]::GetFullPath($OutputDirectory)
$java=Get-ChildItem -LiteralPath (Join-Path $ToolRoot 'java') -Directory | Select-Object -First 1
if(!$java){throw 'Install JDK 21 in ToolRoot/java first.'}
$env:JAVA_HOME=$java.FullName
$env:ANDROID_HOME=Join-Path $ToolRoot 'sdk'
$env:ANDROID_USER_HOME=Join-Path $ToolRoot 'android-user'
$env:GRADLE_USER_HOME=Join-Path $ToolRoot 'gradle-cache'
$gradle=Join-Path $ToolRoot 'gradle-8.13/bin/gradle.bat'
if(!(Test-Path -LiteralPath $gradle)){throw 'Gradle 8.13 is required.'}
if(!$DebugBuild -and (!$env:HD_ANDROID_KEYSTORE -or !$env:HD_ANDROID_STORE_PASSWORD)){throw 'Set private signing environment variables HD_ANDROID_KEYSTORE and HD_ANDROID_STORE_PASSWORD. Never commit the key or password.'}
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$build=Join-Path $OutputDirectory 'build-cache'
$cache=Join-Path $OutputDirectory 'project-cache'
$variant=if($DebugBuild){'Debug'}else{'Release'}
Push-Location $PSScriptRoot
try {
 & $gradle --no-daemon --project-cache-dir $cache "-PbuildRoot=$build" ":app:assemble$variant"
 if($LASTEXITCODE){throw 'Android build failed.'}
 $apk=Join-Path $build ('app/outputs/apk/'+$variant.ToLower()+'/app-'+$variant.ToLower()+'.apk')
 $target=Join-Path $OutputDirectory ('headache-diary-android-0.1.0-'+$variant.ToLower()+'.apk')
 Copy-Item -LiteralPath $apk -Destination $target
 (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLower()+'  '+[IO.Path]::GetFileName($target) | Set-Content -LiteralPath (Join-Path $OutputDirectory 'SHA256SUMS.txt') -Encoding ascii
 Write-Host "Built: $target"
} finally { Pop-Location }
