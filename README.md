<img align="center" src="macast_slogan.png" alt="slogan" height="auto"/>

# Macast

[![visitor](https://visitor-badge.glitch.me/badge?page_id=xfangfang.Macast)](https://github.com/xfangfang/Macast/releases/latest)
![stars](https://img.shields.io/badge/dynamic/json?label=github%20stars&query=stargazers_count&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fxfangfang%2FMacast)
[![downloads](https://img.shields.io/github/downloads/xfangfang/Macast/total?color=blue)](https://github.com/xfangfang/Macast/releases/latest)
[![plugins](https://shields-staging.herokuapp.com/github/directory-file-count/xfangfang/Macast-plugins?type=dir&label=plugins)](https://github.com/xfangfang/Macast-plugins)
[![pypi](https://img.shields.io/pypi/v/macast)](https://pypi.org/project/macast/)
[![aur](https://img.shields.io/aur/version/macast-git?color=yellowgreen)](https://aur.archlinux.org/packages/macast-git/)
[![build](https://img.shields.io/github/workflow/status/xfangfang/Macast/Build%20Macast)](https://github.com/xfangfang/Macast/actions/workflows/build-macast.yaml)
[![mac](https://img.shields.io/badge/MacOS-10.14%20and%20higher-lightgrey?logo=Apple)](https://github.com/xfangfang/Macast/releases/latest)
[![windows](https://img.shields.io/badge/Windows-7%20and%20higher-lightgrey?logo=Windows)](https://github.com/xfangfang/Macast/releases/latest)
[![linux](https://img.shields.io/badge/Linux-Xorg-lightgrey?logo=Linux)](https://github.com/xfangfang/Macast/releases/latest)



[中文说明](README_ZH.md)

A menu bar application using mpv as **DLNA Media Renderer**. You can push videos, pictures or musics from your mobile phone to your computer.


## Installation

- ### MacOS || Windows || Debian

  Download link:  [Macast release latest](https://github.com/xfangfang/Macast/releases/latest)

- ### Package manager

  ```shell
  pip install macast
  macast-gui # or macast-cli
  ```

  Please see our wiki for more information(like **aur** support): [#package-manager](https://github.com/xfangfang/Macast/wiki/Installation#package-manager)  
  Linux users may have problems installing using pip. Two additional libraries that I have modified need to be installed:

  ```shell
  pip install git+https://github.com/xfangfang/pystray.git
  pip install git+https://github.com/xfangfang/pyperclip.git
  ```

  **See [this](https://github.com/xfangfang/Macast/wiki/Installation#linux) for Linux compatibility**

- ### Build from source

  #### Prerequisites

  - Python >= 3.6
  - mpv (required for media playback) — [download](https://github.com/shinchiro/mpv-winbuild-cmake/releases) (Windows), `brew install mpv` (macOS), `sudo apt install mpv` (Linux)
  - Node.js >= 18 and npm (only required for Web Renderer 2)

  #### Setup virtual environment

  ```bash
  python -m venv .venv
  source .venv/Scripts/activate   # Windows (Git Bash)
  # or: .venv\Scripts\activate    # Windows (CMD)
  # or: source .venv/bin/activate # macOS / Linux

  pip install --upgrade pip
  pip install -r requirements/common.txt
  pip install -e .
  ```

  #### Run in development

  ```bash
  .venv/Scripts/python Macast.py
  # Linux: export PYSTRAY_BACKEND=gtk && .venv/bin/python Macast.py
  ```

  #### Build with PowerShell (Windows, recommended)

  ```powershell
  .\build.ps1                       # Clean build with mpv bundled
  .\build.ps1 -SkipMpv              # Build without mpv (~24MB exe)
  .\build.ps1 -Clean:$false         # Skip cleaning previous build
  .\build.ps1 -WithWebRenderer      # Build with Web Renderer 2 bundled
  .\build.ps1 -SkipMpv -WithWebRenderer  # Combined flags
  ```

  The script handles: venv activation, dependency install, .po→.mo compilation, clean, PyInstaller packaging, and optionally builds + bundles the Web Renderer 2 subproject (Node.js server + React client).

  #### Build with PyInstaller (manual)

  ```bash
  pip install pyinstaller polib

  # Compile .po to .mo before building (i18n)
  .venv/Scripts/python -c "
  import polib
  for lang in ['zh_CN', 'fi', 'it']:
      po = polib.pofile(f'i18n/{lang}/LC_MESSAGES/macast.po')
      po.save_as_mofile(f'i18n/{lang}/LC_MESSAGES/macast.mo')
  "

  # Clean previous builds
  rm -rf build dist Macast.spec

  # Build (Windows — use ; as separator)
  pyinstaller --noconfirm -F -w \
    --additional-hooks-dir=. \
    --add-data="macast/.version;." \
    --add-data="macast/xml;macast/xml" \
    --add-data="i18n;i18n" \
    --add-data="macast/assets;macast/assets" \
    --add-binary="bin/mpv.exe;bin" \
    --icon=macast/assets/icon.ico \
    Macast.py

  # Linux/macOS — use : as separator
  pyinstaller --noconfirm -F -w \
    --additional-hooks-dir=. \
    --add-data="macast/.version:." \
    --add-data="macast/xml:macast/xml" \
    --add-data="i18n:i18n" \
    --add-data="macast/assets:macast/assets" \
    Macast.py
  ```

  Key PyInstaller flags:
  - `-F`: single file
  - `-w`: no console window (GUI app)
  - `--additional-hooks-dir=.`: picks up `hook-pystray.py` for hidden imports
  - `--add-data`: use directory mode (`macast/xml;macast/xml`) to include all files recursively
  - Output: `dist/Macast.exe` (~68MB with mpv, ~24MB without)

  #### macOS (py2app)

  ```bash
  pip install py2app
  python setup.py py2app
  cp -R bin dist/Macast.app/Contents/Resources/
  ```

  ### Web Renderer 2 — 浏览器投屏播放模块

  Web Renderer 2 is a standalone browser-based cast viewing module. It deploys a Node.js + React service on `0.0.0.0:2554`, allowing multiple browser clients to simultaneously watch DLNA cast content with independent playback controls.

  **Flow**: `DLNA Cast → Macast (Renderer Plugin) → HTTP POST → Node.js → WebSocket → Browser Playback`

  #### Quick Deploy (Development)

  ```powershell
  # Build + package + install dependencies
  .\web_renderer_2\deploy.ps1

  # Skip build (if already built manually)
  .\web_renderer_2\deploy.ps1 -SkipBuild

  # Skip npm install
  .\web_renderer_2\deploy.ps1 -SkipNpmInstall
  ```

  #### Manual Deploy

  ```bash
  cd web_renderer_2/client && npm install && npm run build
  cd ../server && npm install && npm run build

  # Copy to Macast settings directory
  # Windows: %LOCALAPPDATA%\xfangfang\Macast\
  # macOS: ~/Library/Application Support/Macast/
  # Linux: ~/.config/Macast/

  cp -r server/dist/* "$SETTING_DIR/web_renderer_2_app/server/dist/"
  cp -r client/dist/* "$SETTING_DIR/web_renderer_2_app/client/dist/"
  cp server/package.json "$SETTING_DIR/web_renderer_2_app/server/"
  cd "$SETTING_DIR/web_renderer_2_app/server" && npm install --omit=dev

  cp web_renderer_2/macast_renderer.py "$SETTING_DIR/renderer/web_renderer_2.py"
  ```


## Usage

- **For ordinary users**  
After opening this app, a small icon will appear in the **menubar** / **taskbar** / **desktop panel**, then you can push your media files from a local DLNA client to your computer.

- **For advanced users**  
  1. By loading the [Macast-plugins](https://github.com/xfangfang/Macast-plugins), Macast can support third-party players like IINA and PotPlayer.  
  For more information, see: [#how-to-use-third-party-player-plug-in](https://github.com/xfangfang/Macast/wiki/FAQ#how-to-use-third-party-player-plug-in)
  2. You can modify the shortcut keys or configuration of the default mpv player by yourself, see: [#how-to-set-personal-configurations-to-mpv](https://github.com/xfangfang/Macast/wiki/FAQ#how-to-set-personal-configurations-to-mpv)

- **For developer**  
You can use a few lines of code to add support for other players like IINA and PotPlayer or even add additional features, like downloading media files while playing videos.  
Tutorials and examples are shown in: [Macast/wiki/Custom-Renderer](https://github.com/xfangfang/Macast/wiki/Custom-Renderer).  
Fell free to submit a pull request to [Macast-plugins](https://github.com/xfangfang/Macast-plugins).  


## Development

### Architecture

```
Macast.py (entry, locale setup, mpv path)
  └── gui() / cli()  [macast/macast.py]
        └── Macast(App) — system tray app, plugin manager, settings menu
              └── Service [macast/server.py] — CherryPy HTTP server
                    ├── AutoPortServer — port-fallback HTTP server
                    ├── SSDPPlugin [macast/plugin.py] → SSDPServer [macast/ssdp.py]
                    ├── RendererPlugin → MPVRenderer [macast_renderer/mpv.py]
                    ├── ProtocolPlugin → DLNAProtocol [macast/protocol.py]
                    └── DLNAHandler — SOAP/event endpoints at /
```

### Key Files

| File | Purpose |
|---|---|
| `Macast.py` | Entry point: locale, mpv path, launch gui |
| `macast/macast.py` | Main app class, plugin manager, tray menu, gui/cli entry |
| `macast/gui.py` | Cross-platform GUI abstraction (rumps/pystray) |
| `macast/protocol.py` | DLNA/UPnP protocol, SOAP handling, state machine |
| `macast/server.py` | CherryPy HTTP server, Service orchestrator |
| `macast/plugin.py` | CherryPy plugins (Renderer, Protocol, SSDP) |
| `macast/ssdp.py` | SSDP/UDP multicast discovery |
| `macast/utils.py` | Settings persistence, IP detection, helpers |
| `macast/renderer.py` | Abstract renderer base class |
| `macast_renderer/mpv.py` | mpv renderer: process management, JSON IPC |
| `web_renderer_2/` | Web Renderer 2: browser cast viewing module |

### Startup Sequence

1. `Macast.py`: clear logs → load locale → set mpv path → call `gui()`
2. `gui()`: create `MPVRenderer` + `DLNAProtocol` → instantiate `Macast(App)`
3. `Macast.__init__()`: create `MacastPluginManager`, load settings, create `Service`, build tray menu
4. `Service.run()`: start AutoPortServer → SSDPPlugin → RendererPlugin → ProtocolPlugin → SSDP Monitor → `cherrypy.engine.block()`

### HTTP API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/description.xml` | UPnP device description |
| `GET` | `/` | Settings page (`setting.html` — Vue.js SPA) |
| `GET` | `/api?query=log` | Return macast.log contents |
| `GET` | `/api?query=launch-param` | Return current settings JSON |
| `POST` | `/api` | Save settings or install plugin |
| `POST` | `/{service}/action` | DLNA SOAP actions |
| `SUBSCRIBE` | `/{service}/event` | UPnP event subscription |
| `UNSUBSCRIBE` | `/{service}/event` | UPnP event unsubscription |

### DLNA SOAP Endpoints

| Service Path | Actions |
|---|---|
| `/AVTransport/action` | GetCurrentTransportActions, GetDeviceCapabilities, GetMediaInfo, GetPositionInfo, GetTransportInfo, GetTransportSettings, Next, Pause, Play, Previous, Seek, SetAVTransportURI, SetPlayMode, Stop |
| `/RenderingControl/action` | GetMute, GetVolume, GetVolumeDB, GetVolumeDBRange, ListPresets, SelectPreset, SetMute, SetVolume |
| `/ConnectionManager/action` | GetCurrentConnectionInfo, GetProtocolInfo, GetCurrentConnectionIDs |

### mpv IPC Protocol

Communicates with mpv via JSON IPC: named pipe on Windows (`\\.\pipe\macast_mpvsocket{rand}`), Unix domain socket on macOS/Linux (`/tmp/macast_mpvsocket{rand}`).

Key commands: `loadfile`, `set_property volume/mute/pause/speed`, `seek`, `stop`, `observe_property`.

### Plugin System

Custom plugins are Python files placed in `{SETTING_DIR}/renderer/` or `{SETTING_DIR}/protocol/`. Plugin metadata via XML-style comments:

```python
# <macast.title>My Plugin</macast.title>
# <macast.renderer>MyRenderer</macast.renderer>
# <macast.platform>darwin,win32,linux</macast.platform>
```

### Internationalization

Gettext-based. PO files at `i18n/{locale}/LC_MESSAGES/macast.po`. Must be compiled to `.mo` before packaging:

```bash
pip install polib
python -c "
import polib
for lang in ['zh_CN', 'fi', 'it']:
    po = polib.pofile(f'i18n/{lang}/LC_MESSAGES/macast.po')
    po.save_as_mofile(f'i18n/{lang}/LC_MESSAGES/macast.mo')
"
```

### Settings System

Settings stored at `~/.config/Macast/macast_setting.json` (platform-specific via `appdirs`):

| Key | Default | Description |
|---|---|---|
| `DLNA_FriendlyName` | "Macast(HOSTNAME)" | Name shown to DLNA clients |
| `ApplicationPort` | 0 (auto) | HTTP server port |
| `Macast_Renderer` | "MPV Renderer" | Active renderer plugin |
| `Macast_Protocol` | "DLNA Protocol" | Active protocol plugin |
| `CheckUpdate` | 1 | Auto check for updates |
| `StartAtLogin` | 0 | Launch at system startup |

## FAQ
If you have any questions about this application, please check: [Macast/wiki/FAQ](https://github.com/xfangfang/Macast/wiki/FAQ).  
If this does not solve your problem, please open a new issue to notify us, we are willing to help you solve the problem.

## Screenshots

You can copy the video link after the video is casted：  
<img align="center" width="400" src="https://github.com/xfangfang/xfangfang.github.io/raw/master/assets/img/macast/copy_uri.png" alt="copy_uri" height="auto"/>

Or select a third-party player plug-in  
<img align="center" width="400" src="https://github.com/xfangfang/xfangfang.github.io/raw/master/assets/img/macast/select_renderer.png" alt="select_renderer" height="auto"/>

## Relevant links

[UPnP™ Device Architecture 1.1](http://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf)

[UPnP™ Resources](http://upnp.org/resources/upnpresources.zip)

[UPnP™ ContentDirectory:1 service](http://upnp.org/specs/av/UPnP-av-ContentDirectory-v1-Service.pdf)

[UPnP™ MediaRenderer:1 device](http://upnp.org/specs/av/UPnP-av-MediaRenderer-v1-Device.pdf)

[UPnP™ AVTransport:1 service](http://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf)

[UPnP™ RenderingControl:1 service](http://upnp.org/specs/av/UPnP-av-RenderingControl-v1-Service.pdf)

[python-upnp-ssdp-example](https://github.com/ZeWaren/python-upnp-ssdp-example)
