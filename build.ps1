#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build Macast into a standalone Windows executable (dist/Macast.exe).

.DESCRIPTION
    Checks prerequisites, sets up the Python virtual environment, installs
    dependencies, compiles translations, and bundles everything with PyInstaller.
    The resulting exe includes mpv and is ready for distribution.

    With -WithWebRenderer, also builds the Web Renderer 2 React client
    and bundles it together with the Python server (aiohttp) into the exe.
    No Node.js runtime is needed on the target machine.

.PARAMETER Clean
    Remove build/dist/Macast.spec before building (default: true).

.PARAMETER SkipMpv
    Build without bundling mpv (smaller exe, but mpv must be installed separately).

.PARAMETER WithWebRenderer
    Build and bundle the Web Renderer 2 subproject.
    Requires Node.js >= 18 and npm for building the React client only.
    The bundled app is auto-extracted to the Macast settings directory on first run.
    No Node.js required at runtime — the server is Python (aiohttp).

.EXAMPLE
    .\build.ps1
    .\build.ps1 -Clean:$false
    .\build.ps1 -SkipMpv
    .\build.ps1 -WithWebRenderer
    .\build.ps1 -SkipMpv -WithWebRenderer
#>

param(
    [bool]$Clean = $true,
    [switch]$SkipMpv,
    [switch]$WithWebRenderer,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Macast Build Script — build.ps1

Build Macast into a standalone Windows executable (dist/Macast.exe).

USAGE:
  .\build.ps1 [OPTIONS]

OPTIONS:
  -Clean <bool>        Remove build/dist/Macast.spec before building.
                       Default: true.  Use -Clean:`$false to skip.

  -SkipMpv             Build without bundling mpv.exe.
                       The resulting exe is smaller (~24 MB vs ~68 MB)
                       but mpv must be installed separately on the
                       target machine.

  -WithWebRenderer     Build and bundle the Web Renderer 2 subproject.
                       Requires Node.js >= 18 and npm (build only, not runtime).
                       Builds the React client (Vite), then bundles it with
                       the Python aiohttp server into the exe.
                       On first run, the app auto-extracts to:
                         %LOCALAPPDATA%\xfangfang\Macast\web_renderer_2_app\

  -Help                Show this help and exit.

EXAMPLES:
  .\build.ps1                          Clean build with mpv
  .\build.ps1 -Clean:`$false           Rebuild without cleaning
  .\build.ps1 -SkipMpv                 Build without mpv
  .\build.ps1 -WithWebRenderer         Build with Web Renderer 2 bundled
  .\build.ps1 -SkipMpv -WithWebRenderer  Combined flags

OUTPUT:
  dist/Macast.exe      Standalone executable, ready for distribution.
"@
    exit 0
}

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$VenvDir = Join-Path $ProjectRoot ".venv"
$BinDir = Join-Path $ProjectRoot "bin"
$MpvExe = Join-Path $BinDir "mpv.exe"
$WebRendererDir = Join-Path $ProjectRoot "web_renderer_2"
$WebRendererClientDir = Join-Path $WebRendererDir "client"
$ServerPyDir = Join-Path $WebRendererDir "server_py"
$StagingDir = Join-Path $WebRendererDir "staging"

# ── helpers ──────────────────────────────────────────────────────────

function Write-Step($msg) {
    Write-Host "`n>>> " -NoNewline -ForegroundColor Cyan
    Write-Host $msg -ForegroundColor White
}

function Write-Err($msg) {
    Write-Host "ERROR: $msg" -ForegroundColor Red
}

function Ensure-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Err "'$name' is not available. Install it and try again."
        exit 1
    }
}

# ── check mpv ────────────────────────────────────────────────────────

if (-not $SkipMpv) {
    if (-not (Test-Path $MpvExe)) {
        Write-Err "mpv.exe not found at: $MpvExe"
        Write-Host @"

mpv is required for media playback. Download it from:
  https://github.com/shinchiro/mpv-winbuild-cmake/releases

Choose a build (e.g. mpv-x86_64-YYYYMMDD-git-XXXX.7z), extract it,
and place mpv.exe at:

  $MpvExe

Then re-run this script. Alternatively, build without mpv:

  .\build.ps1 -SkipMpv

"@
        exit 1
    }
    Write-Host "[ok] mpv.exe found" -ForegroundColor Green
}

# ── check python ─────────────────────────────────────────────────────

Ensure-Command python

$pyVer = & python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
Write-Host "[ok] Python $pyVer detected" -ForegroundColor Green

# ── venv ─────────────────────────────────────────────────────────────

if (-not (Test-Path (Join-Path $VenvDir "Scripts" "python.exe"))) {
    Write-Step "Creating virtual environment..."
    & python -m venv $VenvDir
}

$Python = Join-Path $VenvDir "Scripts" "python.exe"
$Pip = Join-Path $VenvDir "Scripts" "pip.exe"

Write-Step "Upgrading pip..."
& $Python -m pip install --upgrade pip --quiet

# ── dependencies ─────────────────────────────────────────────────────

Write-Step "Installing runtime dependencies..."
& $Pip install requests appdirs cherrypy lxml netifaces pillow pyperclip pystray pywin32 --quiet

if ($WithWebRenderer) {
    Write-Step "Installing Web Renderer 2 dependency (aiohttp)..."
    & $Pip install aiohttp --quiet
}

Write-Step "Installing build tools..."
& $Pip install pyinstaller polib --quiet

Write-Step "Installing Macast in editable mode..."
& $Pip install -e $ProjectRoot --quiet

# ── translations ─────────────────────────────────────────────────────

Write-Step "Compiling translations (.po -> .mo)..."
$ProjectRootFwd = $ProjectRoot -replace '\\', '/'
& $Python -c @"
import polib, pathlib
root = pathlib.Path(r'$ProjectRootFwd')
for lang in ['zh_CN', 'fi', 'it']:
    po = polib.pofile(str(root / 'i18n' / lang / 'LC_MESSAGES' / 'macast.po'))
    po.save_as_mofile(str(root / 'i18n' / lang / 'LC_MESSAGES' / 'macast.mo'))
    print(f'  compiled: {lang}')
"@

# ── web renderer 2 ───────────────────────────────────────────────────

if ($WithWebRenderer) {
    Ensure-Command node
    Ensure-Command npm

    $nodeVer = & node --version
    Write-Host "[ok] Node.js $nodeVer detected (build only)" -ForegroundColor Green

    # Build client only (Python server needs no build step)
    Write-Step "Building Web Renderer 2 client (Vite + React)..."
    Push-Location $WebRendererClientDir
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "  Installing client dependencies..."
            npm install
        }
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Client build failed" }
        Write-Host "  Client built: $WebRendererClientDir\dist\" -ForegroundColor Green
    } finally {
        Pop-Location
    }

    # Create staging directory for PyInstaller bundling
    Write-Step "Creating staging directory for PyInstaller..."
    if (Test-Path $StagingDir) { Remove-Item -Recurse -Force $StagingDir }
    New-Item -ItemType Directory -Force -Path "$StagingDir\server_py" | Out-Null
    New-Item -ItemType Directory -Force -Path "$StagingDir\client\dist" | Out-Null

    Copy-Item -Recurse "$ServerPyDir\*" "$StagingDir\server_py\"
    Copy-Item -Recurse "$WebRendererClientDir\dist\*" "$StagingDir\client\dist\"

    Write-Host "  Staging: $StagingDir" -ForegroundColor Green
}

# ── clean ────────────────────────────────────────────────────────────

if ($Clean) {
    Write-Step "Cleaning previous build..."
    @("build", "dist", "Macast.spec") | ForEach-Object {
        $p = Join-Path $ProjectRoot $_
        if (Test-Path $p) {
            try { Remove-Item -Recurse -Force $p -ErrorAction Stop }
            catch {
                Write-Host "  Warning: Could not remove $p (file in use). Skip." -ForegroundColor Yellow
            }
        }
    }
}

# ── build ────────────────────────────────────────────────────────────

Write-Step "Running PyInstaller..."

$pyiArgs = @(
    "--noconfirm", "-F", "-w",
    "--additional-hooks-dir=.",
    "--add-data=macast/.version;.",
    "--add-data=macast/xml;macast/xml",
    "--add-data=i18n;i18n",
    "--add-data=macast/assets;macast/assets",
    "--icon=macast/assets/icon.ico"
)

if (-not $SkipMpv) {
    $pyiArgs += "--add-binary=bin/mpv.exe;bin"
}

if ($WithWebRenderer) {
    $pyiArgs += "--add-data=$StagingDir;web_renderer_2_app"
    $pyiArgs += "--hidden-import=aiohttp"
}

$pyiArgs += "Macast.py"

& $Python -m PyInstaller $pyiArgs

if ($LASTEXITCODE -ne 0) {
    Write-Err "PyInstaller failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# ── post-build: deploy plugin + app to local settings dir ─────────────

if ($WithWebRenderer) {
    Write-Step "Deploying Web Renderer 2 to local settings directory..."

    $SettingsDir = "$env:LOCALAPPDATA\xfangfang\Macast"
    $AppDir = "$SettingsDir\web_renderer_2_app"
    $PluginDir = "$SettingsDir\renderer"
    $PluginSrc = Join-Path $WebRendererDir "macast_renderer.py"

    # Deploy app files
    if (Test-Path "$AppDir\server_py") { Remove-Item -Recurse -Force "$AppDir\server_py" }
    if (Test-Path "$AppDir\client\dist") { Remove-Item -Recurse -Force "$AppDir\client\dist" }
    New-Item -ItemType Directory -Force -Path "$AppDir\server_py" | Out-Null
    New-Item -ItemType Directory -Force -Path "$AppDir\client\dist" | Out-Null

    Copy-Item -Recurse -Force "$StagingDir\server_py\*" "$AppDir\server_py\"
    Copy-Item -Recurse -Force "$StagingDir\client\*" "$AppDir\client\"

    # Deploy plugin file
    New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null
    Copy-Item $PluginSrc "$PluginDir\web_renderer_2.py" -Force

    Write-Host "  Plugin:  $PluginDir\web_renderer_2.py" -ForegroundColor Green
    Write-Host "  App:     $AppDir" -ForegroundColor Green
}

# ── result ───────────────────────────────────────────────────────────

$ExePath = Join-Path $ProjectRoot "dist" "Macast.exe"
if (Test-Path $ExePath) {
    $size = "{0:N0} MB" -f ((Get-Item $ExePath).Length / 1MB)
    Write-Host "`n>>> Build complete:" -ForegroundColor Green
    Write-Host "    $ExePath" -ForegroundColor White
    Write-Host "    Size: $size" -ForegroundColor White
    if ($WithWebRenderer) {
        Write-Host "`n    Web Renderer 2 is bundled in the exe." -ForegroundColor Cyan
        Write-Host "    On first run, it auto-extracts to:" -ForegroundColor Cyan
        Write-Host "    $env:LOCALAPPDATA\xfangfang\Macast\web_renderer_2_app\" -ForegroundColor Cyan
        Write-Host "    No Node.js required at runtime — server runs in-process (Python aiohttp)." -ForegroundColor Cyan
    }
} else {
    Write-Err "Output exe not found at $ExePath"
    exit 1
}
