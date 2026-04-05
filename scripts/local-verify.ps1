param(
    [string]$BackendUrl = "http://localhost:5000",
    [string]$Username = "invalid-user",
    [string]$Password = "invalid-pass"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot "backend"

Write-Host "[1/4] Starting backend (npm run dev) in background..."
$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev
} -ArgumentList $backendDir

try {
    Write-Host "[2/4] Waiting for health endpoint..."
    $healthy = $false

    for ($i = 0; $i -lt 30; $i++) {
        try {
            $health = Invoke-RestMethod -Uri "$BackendUrl/api/health" -Method GET -TimeoutSec 2
            if ($health.status -eq "OK") {
                $healthy = $true
                break
            }
        } catch {
            # Keep polling until backend is ready.
        }

        Start-Sleep -Seconds 1
    }

    if (-not $healthy) {
        throw "Backend did not become healthy at $BackendUrl/api/health"
    }

    Write-Host "[3/4] Health check passed: status=OK"

    Write-Host "[4/4] Verifying POST /api/auth/login returns API status (not 501)..."
    try {
        $loginResponse = Invoke-RestMethod -Uri "$BackendUrl/api/auth/login" -Method POST -ContentType "application/json" -Body (@{ username = $Username; password = $Password } | ConvertTo-Json)
        if ($loginResponse.token) {
            Write-Host "Login endpoint OK: token issued." -ForegroundColor Green
        } else {
            Write-Host "Login endpoint responded without token (still not 501)." -ForegroundColor Yellow
        }
    } catch {
        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        if ($statusCode -eq 401 -or $statusCode -eq 400) {
            Write-Host "Login endpoint OK: returned expected auth status $statusCode (not 501)." -ForegroundColor Green
        } elseif ($statusCode) {
            throw "Login endpoint returned unexpected status $statusCode"
        } else {
            throw "Login endpoint request failed without HTTP status"
        }
    }

    Write-Host "Verification complete." -ForegroundColor Green
}
finally {
    if ($backendJob -and $backendJob.State -eq "Running") {
        Stop-Job -Job $backendJob
    }

    if ($backendJob) {
        Remove-Job -Job $backendJob -Force
    }
}
