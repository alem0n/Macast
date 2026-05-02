# Web Renderer 2 — Deploy Script (Windows PowerShell)
# Builds the React client and deploys the Python server + client to:
#   1. Macast settings directory (runtime) — default behavior
#   2. Staging directory (for PyInstaller bundling) — with -StagingDir
#
# Run from project root:
#   .\web_renderer_2\deploy.ps1                    # Full deploy to SETTING_DIR
#   .\web_renderer_2\deploy.ps1 -SkipBuild         # Deploy pre-built artifacts
#   .\web_renderer_2\deploy.ps1 -StagingDir <path> # Create staging for build.ps1
#   .\web_renderer_2\deploy.ps1 -SkipNpmInstall    # Skip npm install (deps already present)

param(
    [switch]$SkipBuild = $false,
    [switch]$SkipNpmInstall = $false,
    [string]$StagingDir = "",
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Web Renderer 2 — Deploy Script (deploy.ps1)

Build the React client and deploy the Python server + client to the
Macast settings directory, or create a staging directory for PyInstaller.

No Node.js runtime required on the target machine — the server runs in
Python using aiohttp.

USAGE:
  .\web_renderer_2\deploy.ps1 [OPTIONS]

OPTIONS:
  -SkipBuild           Skip the npm build step.
                       Use when client/dist/ is already built.

  -SkipNpmInstall      Skip npm install for client dependencies.
                       Use when node_modules/ are already present.

  -StagingDir <path>   Also copy build artifacts to a staging directory
                       (used by build.ps1 -WithWebRenderer for bundling
                       into the PyInstaller exe).

  -Help                Show this help and exit.

DEPLOY TARGETS:
  Settings dir:  %LOCALAPPDATA%\xfangfang\Macast\web_renderer_2_app\
  Plugin dir:    %LOCALAPPDATA%\xfangfang\Macast\renderer\web_renderer_2.py

EXAMPLES:
  .\web_renderer_2\deploy.ps1                    Full deploy (build + install)
  .\web_renderer_2\deploy.ps1 -SkipBuild          Deploy pre-built artifacts
  .\web_renderer_2\deploy.ps1 -StagingDir web_renderer_2\staging
"@
    exit 0
}

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SettingsDir = "$env:LOCALAPPDATA\xfangfang\Macast"
$AppDir = "$SettingsDir\web_renderer_2_app"
$PluginDir = "$SettingsDir\renderer"
$ClientSrc = "$PSScriptRoot\client"
$ServerPySrc = "$PSScriptRoot\server_py"

Write-Host "=== Web Renderer 2 Deploy ===" -ForegroundColor Cyan
Write-Host "SettingsDir: $SettingsDir"
Write-Host "AppDir:      $AppDir"
if ($StagingDir) {
    Write-Host "StagingDir:  $StagingDir"
}

# ── helpers ──────────────────────────────────────────────────────────

function Ensure-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$name' is not available. Install it and try again." -ForegroundColor Red
        exit 1
    }
}

# ── 1. Build client ──────────────────────────────────────────────────

if (-not $SkipBuild) {
    Ensure-Command node
    Ensure-Command npm

    Write-Host "`n[1/3] Building client (Vite + React)..." -ForegroundColor Yellow
    Push-Location $ClientSrc
    try {
        if (-not $SkipNpmInstall -or -not (Test-Path "node_modules")) {
            npm install
        }
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Client build failed" }
        Write-Host "  Client built: $ClientSrc\dist\" -ForegroundColor Green
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`nSkipping build (-SkipBuild)" -ForegroundColor Gray
}

# ── 2. Copy artifacts to SETTING_DIR ─────────────────────────────────

Write-Host "`n[2/3] Copying build artifacts to settings directory..." -ForegroundColor Yellow

# Clean and recreate app directories
if (Test-Path "$AppDir\server_py") { Remove-Item -Recurse -Force "$AppDir\server_py" }
if (Test-Path "$AppDir\client\dist") { Remove-Item -Recurse -Force "$AppDir\client\dist" }
New-Item -ItemType Directory -Force -Path "$AppDir\server_py" | Out-Null
New-Item -ItemType Directory -Force -Path "$AppDir\client\dist" | Out-Null

# Copy Python server package
Copy-Item -Recurse "$ServerPySrc\*" "$AppDir\server_py\"

# Copy React client build
Copy-Item -Recurse "$ClientSrc\dist\*" "$AppDir\client\dist\"

Write-Host "  Server: $AppDir\server_py\" -ForegroundColor Green
Write-Host "  Client: $AppDir\client\dist\" -ForegroundColor Green

# ── 2b. Copy artifacts to staging dir (if requested) ─────────────────

if ($StagingDir) {
    Write-Host "`n Copying build artifacts to staging directory..." -ForegroundColor Yellow
    if (Test-Path $StagingDir) { Remove-Item -Recurse -Force $StagingDir }
    New-Item -ItemType Directory -Force -Path "$StagingDir\server_py" | Out-Null
    New-Item -ItemType Directory -Force -Path "$StagingDir\client\dist" | Out-Null

    Copy-Item -Recurse "$ServerPySrc\*" "$StagingDir\server_py\"
    Copy-Item -Recurse "$ClientSrc\dist\*" "$StagingDir\client\dist\"

    Write-Host "  Staging: $StagingDir" -ForegroundColor Green
}

# ── 3. Deploy plugin file ────────────────────────────────────────────

Write-Host "`n[3/3] Deploying plugin file..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null
Copy-Item "$PSScriptRoot\macast_renderer.py" "$PluginDir\web_renderer_2.py" -Force
Write-Host "  Plugin: $PluginDir\web_renderer_2.py" -ForegroundColor Green

Write-Host "`n=== Deploy complete ===" -ForegroundColor Green
Write-Host "Restart Macast and select 'Web Renderer 2' from Settings > Renderers."
Write-Host "No Node.js required — the Python server runs in-process via aiohttp."
