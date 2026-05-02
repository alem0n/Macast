# Macast Extended

> **An enhanced fork of [Macast](https://github.com/xfangfang/Macast)** — a cross-platform DLNA Media Renderer that lets you push videos, pictures, and music from your mobile phone to your computer via mpv.

This fork extends Macast with a **browser-based cast receiver**, improved touch gestures, and architectural simplifications, while maintaining full compatibility with the upstream project.

---

## Extensions in This Fork

### 1. Web Renderer 2 — Browser Cast Receiver

The headline feature. DLNA casts can be viewed in **any modern browser** on the local network. Multiple clients can watch the same cast simultaneously, each with independent playback controls.

```
DLNA Client (phone/tablet)
        │
        ▼
Macast (CherryPy + DLNA Protocol)
        │  Renderer Plugin → HTTP POST /api/cast
        ▼
Python aiohttp Server (port 2554)
        │
        ├── REST API: cast reception, status, health check
        ├── WebSocket: real-time cast broadcast to browsers
        └── Static Files: React SPA
              │
              ▼
        Browser Clients (Chrome / Firefox / Safari / Edge)
```

**Key design decisions:**

| Decision | Rationale |
|---|---|
| Python aiohttp server | Eliminates Node.js/npm dependency; single-language stack |
| Single-video mode | New casts replace current; no playback history |
| Independent playback | Each client controls its own play/pause/seek/volume |
| Format auto-detection | `.mp4` → mp4, `.webm` → webm, `.m3u8` → hls, `.mpd` → dash |
| HLS via hls.js | Safari native; other browsers load hls.js on demand |

**Features:**
- **Multi-client** — any number of browsers connect simultaneously
- **REST API** — `POST /api/cast`, `GET /api/cast`, `GET /api/users`, `GET /api/status`
- **WebSocket** — real-time cast broadcast, user presence (online/offline), heartbeat (30s)
- **Responsive UI** — dark theme, mobile-friendly, fullscreen support
- **Redux state management** — predictable player + user state
- **Auto browser open** on renderer selection (macOS/Windows/Linux)

**Integration — zero changes to Macast core code:**

Web Renderer 2 is a Macast Renderer Plugin, using the existing plugin discovery mechanism:

```
Right-click tray icon → Settings → Renderers → Web Renderer 2
```

The Python `WebRenderer2` class:
1. Launches the aiohttp server via `subprocess` on first use
2. Forwards DLNA cast URLs via HTTP POST to `127.0.0.1:2554/api/cast`
3. Kills the server process when switching to a different renderer or quitting

The server auto-extracts from `sys._MEIPASS` when running as a PyInstaller exe, so users don't need to install anything manually.

Full documentation: [`web_renderer_2/README.md`](web_renderer_2/README.md)

### 2. Touch Gesture Improvements

- **Drag-to-seek** on the video progress bar (replaced swipe-based video switching)
- **Instant tap-to-toggle** play/pause — no more double-tap delay
- **Smart tap handling** — tap-to-toggle only fires when controls are visible, preventing accidental toggles during fullscreen viewing

### 3. Python aiohttp Server

The Web Renderer 2 backend was rewritten from **Node.js/Express/TypeScript** to **Python aiohttp**, eliminating the Node.js and npm dependency entirely. The server lives at `web_renderer_2/server_py/`:

| File | Purpose |
|---|---|
| `server.py` | aiohttp app: REST routes, WebSocket handler, static file serving |
| `cast_service.py` | URL validation, format detection, in-memory cast storage |
| `config.py` | Constants: PORT=2554, heartbeat interval, timeout |

### 4. Other Improvements

- Fixed and extended keyboard shortcuts
- URL health checker validates cast URLs before forwarding
- Simplified deployment — `deploy.ps1` with staging mode for PyInstaller bundling

---

## Quick Start

```bash
# Standard Macast (mpv renderer)
source .venv/Scripts/activate
python Macast.py

# Switch to Web Renderer 2
# → Right-click tray icon → Settings → Renderers → Web Renderer 2
# → Browser opens automatically at http://127.0.0.1:2554
```

Build with PyInstaller (Windows):

```powershell
.\build.ps1                       # Standard build with mpv
.\build.ps1 -WithWebRenderer      # Build with Web Renderer 2 bundled
.\build.ps1 -SkipMpv -WithWebRenderer  # Combined flags
```

---

---

# Original Macast README

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

  Please refer to: [Macast Development](docs/Development.md)

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

## FAQ
If you have any questions about this application, please check: [Macast/wiki/FAQ](https://github.com/xfangfang/Macast/wiki/FAQ).
If this does not solve your problem, please open a new issue to notify us, we are willing to help you solve the problem.

## Screenshots

You can copy the video link after the video is casted：
<img align="center" width="400" src="https://github.com/xfangfang/xfangfang.github.io/raw/master/assets/img/macast/copy_uri.png" alt="copy_uri" height="auto"/>

Or select a third-party player plug-in
<img align="center" width="400" src="https://github.com/xfangfang/xfangfang.github.io/raw/master/assets/img/macast/select_renderer.png" alt="select_renderer" height="auto"/>

## Relevant links

[UPnP Device Architecture 1.1](http://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf)

[UPnP Resources](http://upnp.org/resources/upnpresources.zip)

[UPnP ContentDirectory:1 service](http://upnp.org/specs/av/UPnP-av-ContentDirectory-v1-Service.pdf)

[UPnP MediaRenderer:1 device](http://upnp.org/specs/av/UPnP-av-MediaRenderer-v1-Device.pdf)

[UPnP AVTransport:1 service](http://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf)

[UPnP RenderingControl:1 service](http://upnp.org/specs/av/UPnP-av-RenderingControl-v1-Service.pdf)

[python-upnp-ssdp-example](https://github.com/ZeWaren/python-upnp-ssdp-example)
