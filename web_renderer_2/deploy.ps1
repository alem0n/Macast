# Web Renderer 2 — Deploy Script (Windows PowerShell)
# Builds server + client and packages to:
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

Build the server + client and deploy to the Macast settings directory,
or create a staging directory for PyInstaller bundling.

USAGE:
  .\web_renderer_2\deploy.ps1 [OPTIONS]

OPTIONS:
  -SkipBuild           Skip the npm build steps.
                       Use when dist/ directories are already built.

  -SkipNpmInstall      Skip npm install for dependencies.
                       Use when node_modules/ are already present.

  -StagingDir <path>   Also copy build artifacts to a staging directory
                       (used by build.ps1 -WithWebRenderer for bundling
                       into the PyInstaller exe).

  -Help                Show this help and exit.

DEPLOY TARGETS:
  Settings dir:  `%LOCALAPPDATA%\xfangfang\Macast\web_renderer_2_app\
  Plugin dir:    `%LOCALAPPDATA%\xfangfang\Macast\renderer\web_renderer_2.py

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
$ServerSrc = "$PSScriptRoot\server"
$ClientSrc = "$PSScriptRoot\client"

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

# ── 1. Build ─────────────────────────────────────────────────────────

if (-not $SkipBuild) {
    Ensure-Command node
    Ensure-Command npm

    Write-Host "`n[1/4] Building client (Vite + React)..." -ForegroundColor Yellow
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

    Write-Host "`n[2/4] Building server (TypeScript)..." -ForegroundColor Yellow
    Push-Location $ServerSrc
    try {
        if (-not $SkipNpmInstall -or -not (Test-Path "node_modules")) {
            npm install
        }
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Server build failed" }
        Write-Host "  Server built: $ServerSrc\dist\" -ForegroundColor Green
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`nSkipping build (-SkipBuild)" -ForegroundColor Gray
}

# ── 2. Copy artifacts to SETTING_DIR ─────────────────────────────────

Write-Host "`n[3/4] Copying build artifacts to settings directory..." -ForegroundColor Yellow

# Clean and recreate app directory
if (Test-Path "$AppDir\server\dist") { Remove-Item -Recurse -Force "$AppDir\server\dist" }
if (Test-Path "$AppDir\client\dist") { Remove-Item -Recurse -Force "$AppDir\client\dist" }
New-Item -ItemType Directory -Force -Path "$AppDir\server\dist" | Out-Null
New-Item -ItemType Directory -Force -Path "$AppDir\client\dist" | Out-Null

Copy-Item -Recurse "$ServerSrc\dist\*" "$AppDir\server\dist\"
Copy-Item -Recurse "$ClientSrc\dist\*" "$AppDir\client\dist\"
Copy-Item "$ServerSrc\package.json" "$AppDir\server\"

Write-Host "  Server: $AppDir\server\dist\" -ForegroundColor Green
Write-Host "  Client: $AppDir\client\dist\" -ForegroundColor Green

# ── 2b. Copy artifacts to staging dir (if requested) ─────────────────

if ($StagingDir) {
    Write-Host "`n Copying build artifacts to staging directory..." -ForegroundColor Yellow
    if (Test-Path $StagingDir) { Remove-Item -Recurse -Force $StagingDir }
    New-Item -ItemType Directory -Force -Path "$StagingDir\server\dist" | Out-Null
    New-Item -ItemType Directory -Force -Path "$StagingDir\client\dist" | Out-Null

    Copy-Item -Recurse "$ServerSrc\dist\*" "$StagingDir\server\dist\"
    Copy-Item "$ServerSrc\package.json" "$StagingDir\server\"
    Copy-Item -Recurse "$ClientSrc\dist\*" "$StagingDir\client\dist\"

    Write-Host "  Staging: $StagingDir" -ForegroundColor Green
}

# ── 3. Install production dependencies ───────────────────────────────

Write-Host "`n[4/4] Installing production dependencies..." -ForegroundColor Yellow
Push-Location "$AppDir\server"
npm install --omit=dev
Pop-Location
Write-Host "  Dependencies installed in $AppDir\server\node_modules\" -ForegroundColor Green

# ── 4. Deploy plugin file ────────────────────────────────────────────

Write-Host "`n Deploying plugin file..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null
Copy-Item "$PSScriptRoot\macast_renderer.py" "$PluginDir\web_renderer_2.py" -Force
Write-Host "  Plugin: $PluginDir\web_renderer_2.py" -ForegroundColor Green

Write-Host "`n=== Deploy complete ===" -ForegroundColor Green
Write-Host "Restart Macast and select 'Web Renderer 2' from Settings > Renderers."
