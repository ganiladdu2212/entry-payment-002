param(
    [Parameter(Mandatory=$true)][string]$HostUrl,
    [string]$BuildDirectory = 'C:\ep002build-20261104',
    [string]$JavaHomePath,
    [string]$AndroidSdkPath,
    [switch]$CheckOnly,
    [switch]$PublicApi
)
$ErrorActionPreference = 'Stop'
$uri = [uri]$HostUrl.Trim()
if (-not $uri.IsAbsoluteUri -or $uri.Scheme -ne 'https' -or $uri.UserInfo -or $uri.Query -or $uri.Fragment -or $uri.AbsolutePath -notin @('/','/api/v1','/api/v1/')) {
    throw 'Use an HTTPS host URL, optionally ending in /api/v1, without credentials, query, or fragment.'
}
$apiUrl = $uri.GetLeftPart([UriPartial]::Authority) + '/api/v1'
$source = $PSScriptRoot
$build = (Resolve-Path -LiteralPath $BuildDirectory).Path
if ($build -eq $source -or -not (Test-Path -LiteralPath "$build\android\gradlew.bat") -or -not (Test-Path -LiteralPath "$build\node_modules\expo\package.json")) {
    throw 'This script needs the existing short-path Android build checkout with dependencies installed.'
}
$javaCandidates = @($JavaHomePath, $env:JAVA_HOME, 'C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot')
$javaHome = $javaCandidates | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'bin\java.exe')) -and (Test-Path -LiteralPath (Join-Path $_ 'bin\javac.exe')) } | Select-Object -First 1
if (-not $javaHome) { throw 'JDK not found. Supply -JavaHomePath pointing to a JDK folder containing bin\java.exe and bin\javac.exe.' }
$sdkCandidates = @($AndroidSdkPath, $env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA 'Android\Sdk'), 'C:\Users\HP\AppData\Local\Android\Sdk')
$sdk = $sdkCandidates | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'build-tools\37.0.0\apksigner.bat')) } | Select-Object -First 1
if (-not $sdk) { throw 'Android build-tools 37.0.0 not found. Supply -AndroidSdkPath pointing to the Android SDK folder.' }
$signer = Join-Path $sdk 'build-tools\37.0.0\apksigner.bat'
Write-Output "Java: $javaHome"
Write-Output "Android SDK: $sdk"
$health = Invoke-RestMethod "$apiUrl/health" -TimeoutSec 15
if ($health.status -ne 'UP') { throw 'The target API is not UP.' }
$probePath = if ($PublicApi) { "/members?managementId=1" } else { "/qa/access" }
$gateStatus = 0
try {
    $gateStatus = [int](Invoke-WebRequest "$apiUrl$probePath" -UseBasicParsing -TimeoutSec 15).StatusCode
} catch {
    if ($_.Exception.Response) { $gateStatus = [int]$_.Exception.Response.StatusCode }
    else { throw }
}
if ($gateStatus -ne 401) { throw "Access check failed: $probePath returned $gateStatus, expected 401 without a code." }
if ($CheckOnly) { Write-Output 'CHECK PASSED: build dependencies and target access checks passed.'; return }
# Host-only rebuild: preserve existing native project, signing key and cache.
Copy-Item "$source\src" $build -Recurse -Force
Copy-Item "$source\assets" $build -Recurse -Force
# Generated build-only source invalidates cached bundles when the URL changes.
# The main project's config is untouched.
$literal = ConvertTo-Json -InputObject $apiUrl -Compress
[IO.File]::WriteAllText("$build\src\config\api.ts", "export const API_BASE_URL = $literal;" + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText("$build\android\app\src\main\res\xml\api_network_security.xml",
    '<?xml version="1.0" encoding="utf-8"?><network-security-config><base-config cleartextTrafficPermitted="false" /></network-security-config>',
    [Text.UTF8Encoding]::new($false))
$names = @('JAVA_HOME','ANDROID_HOME','NODE_ENV','EXPO_PUBLIC_API_URL','EXPO_PUBLIC_QA_GATE')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name,'Process') }
try {
    $env:JAVA_HOME = $javaHome
    $env:ANDROID_HOME = $sdk
    $env:NODE_ENV = 'production'
    $env:EXPO_PUBLIC_API_URL = $apiUrl
    $env:EXPO_PUBLIC_QA_GATE = if ($PublicApi) { '0' } else { '1' }
    Push-Location "$build\android"
    try {
        & .\gradlew.bat assembleRelease --console=plain '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a' --max-workers=2
        if ($LASTEXITCODE -ne 0) { throw 'Android build failed; no APK copied.' }
    } finally { Pop-Location }
    $apk = "$build\android\app\build\outputs\apk\release\app-release.apk"
    & $signer verify --verbose $apk
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($apk)
    try {
        $entry = $zip.GetEntry('assets/index.android.bundle')
        if (-not $entry) { throw 'Missing standalone JavaScript bundle.' }
        $reader = [IO.StreamReader]::new($entry.Open(),[Text.Encoding]::ASCII)
        try { $bundle = $reader.ReadToEnd() } finally { $reader.Dispose() }
        $markers = if ($PublicApi) { @($apiUrl, '/session/logout', 'Bearer ') } else { @($apiUrl, '/qa/access', 'X-QA-Code') }
        foreach ($marker in $markers) {
            if (-not $bundle.Contains($marker)) { throw "Missing bundled setting: $marker" }
        }
    } finally { $zip.Dispose() }
    $outDir = Join-Path (Split-Path $source -Parent) 'artifacts'
    $null = New-Item -ItemType Directory -Path $outDir -Force
    $output = Join-Path $outDir ("EntryPayment-$(if ($PublicApi) { 'Public' } else { 'QA' })-" + $uri.Host.Split('.')[0] + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.apk')
    Copy-Item -LiteralPath $apk -Destination $output
    Write-Output "VERIFIED APK: $output"
    Write-Output "API: $apiUrl"
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name,$previous[$name],'Process') }
}

