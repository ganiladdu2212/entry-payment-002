param([int]$Port = 8090)

$ErrorActionPreference = 'Stop'
$credentialsPath = Join-Path $PSScriptRoot '.env'
if (Test-Path -LiteralPath $credentialsPath) {
    foreach ($line in Get-Content -LiteralPath $credentialsPath) {
        if ($line -match '^\s*(DB_HOST|DB_PORT|DB_URL|DB_USERNAME|DB_PASSWORD)\s*=(.*)$') {
            $name = $Matches[1]
            $value = $Matches[2].Trim()
            if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}
if (-not $env:DB_USERNAME -or $null -eq $env:DB_PASSWORD) {
    throw 'Set DB_USERNAME and DB_PASSWORD in the process environment or in the ignored .env file.'
}
$env:SPRING_PROFILES_ACTIVE = 'mysql'
$env:PORT = "$Port"
Push-Location $PSScriptRoot
try {
    & .\mvnw.cmd --batch-mode --no-transfer-progress spring-boot:run
    $runExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $runExitCode
