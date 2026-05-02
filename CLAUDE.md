# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Macast is a cross-platform DLNA Media Renderer (v0.7, GPL3). It uses mpv to play media pushed from DLNA-compatible clients (phones, tablets) to your computer. Runs on macOS, Windows, and Linux as a system tray/menu bar application.

- **Repo**: https://github.com/xfangfang/Macast
- **Python**: >= 3.6
- **Entry**: `Macast.py` → `gui()` (tray) or `cli()` (headless)

## Virtual Environment (REQUIRED)

Always use the project's `.venv` virtual environment. Do NOT install dependencies globally.

```bash
# Create the venv (one-time)
python -m venv .venv

# Activate (every session)
# Windows (Git Bash / MSYS2):
source .venv/Scripts/activate
# Windows (CMD):
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
```

## Install Dependencies

```bash
# Upgrade pip first
.venv/Scripts/pip install --upgrade pip

# Install runtime dependencies (Windows)
pip install requests appdirs cherrypy lxml netifaces pillow pyperclip pystray pywin32

# Install Macast itself in editable mode
pip install -e .

# Or use requirements files:
pip install -r requirements/common.txt
```

### Platform-specific dependencies

| Platform | Extra Packages |
|---|---|
| macOS (`darwin`) | `rumps`, `pyperclip` |
| Windows (`win32`) | `pillow`, `pyperclip`, `pystray`, `pywin32` |
| Linux | `pillow`, `pystray` (xfangfang fork), `pyperclip` (xfangfang fork) |

## Run (Debug Mode)

```bash
# GUI mode (system tray) — always use .venv Python
.venv/Scripts/python Macast.py

# Linux: may need to set pystray backend
export PYSTRAY_BACKEND=gtk && .venv/bin/python Macast.py
```

### Runtime dependencies

**mpv** is required for media playback. The app will start without it but cannot play media.

- **Download**: https://github.com/shinchiro/mpv-winbuild-cmake/releases (Windows)
- **Place** `mpv.exe` at `bin/mpv.exe` (Windows) or `bin/MacOS/mpv` (macOS)
- On Linux, install via `sudo apt install mpv`

## Package / Compile

### Windows — `build.ps1` (recommended)

A PowerShell 7 build script automates the full process:

```powershell
.\build.ps1                       # Clean build with mpv bundled
.\build.ps1 -SkipMpv              # Build without mpv (~24MB exe)
.\build.ps1 -Clean:$false         # Skip cleaning previous build
.\build.ps1 -WithWebRenderer      # Build with Web Renderer 2 bundled
.\build.ps1 -SkipMpv -WithWebRenderer  # Combined flags
```

The script handles: venv activation, dependency install, .po→.mo compilation, clean, PyInstaller packaging, and optionally builds + bundles the Web Renderer 2 subproject (Node.js server + React client).

`-WithWebRenderer` requires Node.js >= 18 and npm. It builds the client (Vite + React) and server (TypeScript), creates a staging directory in `web_renderer_2/staging/`, adds it to PyInstaller via `--add-data`, and post-build deploys the plugin + app to the local Macast settings directory.

### Windows (PyInstaller) — manual

```bash
pip install pyinstaller

# Clean previous builds first
rm -rf build dist Macast.spec

# Compile .po to .mo before building (i18n)
pip install polib
.venv/Scripts/python -c "
import polib
for lang in ['zh_CN', 'fi', 'it']:
    po = polib.pofile(f'i18n/{lang}/LC_MESSAGES/macast.po')
    po.save_as_mofile(f'i18n/{lang}/LC_MESSAGES/macast.mo')
"

# Build (with mpv bundled)
# IMPORTANT: Use directory mode (macast/xml not macast/xml/*) or files will be missing.
pyinstaller --noconfirm -F -w \
  --additional-hooks-dir=. \
  --add-data="macast/.version;." \
  --add-data="macast/xml;macast/xml" \
  --add-data="i18n;i18n" \
  --add-data="macast/assets;macast/assets" \
  --add-binary="bin/mpv.exe;bin" \
  --icon=macast/assets/icon.ico \
  Macast.py

# Output: dist/Macast.exe (~68MB with mpv, ~24MB without)
```

Key PyInstaller flags:
- `-F`: single file
- `-w`: no console window (GUI app)
- `--additional-hooks-dir=.`: picks up `hook-pystray.py` for hidden imports
- `--add-data`: `source;dest` separator is `;` on Windows, `:` on Linux/macOS
- **`--add-data` directory mode** (e.g. `macast/xml;macast/xml`) recursively includes every file. Glob mode (`macast/xml/*`) is unreliable — it may skip `.html`/`.csv` files and won't recurse into subdirectories.

### macOS (py2app)

```bash
pip install py2app
python setup.py py2app
cp -R bin dist/Macast.app/Contents/Resources/
```

### Linux (PyInstaller)

```bash
pip install pyinstaller
pyinstaller --noconfirm -F -w \
  --additional-hooks-dir=. \
  --add-data=".version:." \
  --add-data="macast/xml:macast/xml" \
  --add-data="i18n:i18n" \
  --add-data="assets:assets" \
  Macast.py
```

Note: On Linux, use `:` instead of `;` as the path separator in `--add-data`.

## Architecture

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

### CherryPy Bus Events (Pub/Sub)

The app uses CherryPy's event bus extensively. Key events:

| Event | Publisher | Subscribers |
|---|---|---|
| `ssdp_notify` | Service (every 3s) | SSDPPlugin |
| `ssdp_update_ip` | Service (every 30s / on IP change) | SSDPPlugin, Macast |
| `renderer_start` | MPVRenderer (IPC connected) | — |
| `renderer_av_stop` | MPVRenderer (end-file event) | Macast |
| `renderer_av_uri` | MPVRenderer (start-file event) | Macast |
| `app_notify` | Various (status/error messages) | Macast.notification |
| `reload_renderer` | MPVRendererSetting | RendererPlugin |
| `get_plugin_info` | Macast | MacastPluginManager |

### Startup Sequence

1. `Macast.py`: clear logs → load locale → set mpv path → call `gui()`
2. `gui()`: create `MPVRenderer` + `DLNAProtocol` → instantiate `Macast(App)`
3. `Macast.__init__()`:
   - Create `MacastPluginManager` (scans custom plugins)
   - Load settings from `~/.config/Macast/macast_setting.json`
   - Create `Service(renderer, protocol)` → `run_async()`
   - Build system tray menu → `App.start()`
4. `Service.run()`:
   - Start AutoPortServer (CherryPy HTTP)
   - Start SSDPPlugin (UDP multicast on 239.255.255.250:1900)
   - Start RendererPlugin (launches mpv process + IPC thread)
   - Start ProtocolPlugin (DLNA state machine)
   - SSDP Monitor every 3s: send NOTIFY, check IP changes every 30s
   - `cherrypy.engine.block()` — main thread waits

## HTTP API Endpoints

Served by `DLNAHandler` (mount at `/`):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/description.xml` | UPnP device description (dynamic UUID, friendly name) |
| `GET` | `/` | Settings page (`setting.html` — Vue.js SPA) |
| `GET` | `/api?query=log` | Return macast.log contents |
| `GET` | `/api?query=launch-param` | Return current settings JSON |
| `GET` | `/api?query=plugin-info` | Return installed plugins list |
| `POST` | `/api` | `body: {launch_param: {...}}` — save settings |
| `POST` | `/api` | `body: {url: "github/author/repo"}` — install plugin |
| `POST` | `/{service}/action` | DLNA SOAP actions (see below) |
| `SUBSCRIBE` | `/{service}/event` | UPnP event subscription |
| `UNSUBSCRIBE` | `/{service}/event` | UPnP event unsubscription |
| `GET` | `/dlna/*` | Static XML files from `macast/xml/` |
| `GET` | `/assets/*` | Static assets from `macast/assets/` |

## DLNA SOAP Endpoints

DLNA clients send SOAP requests to:

| Service Path | SOAP Actions |
|---|---|
| `/AVTransport/action` | `GetCurrentTransportActions`, `GetDeviceCapabilities`, `GetMediaInfo`, `GetPositionInfo`, `GetTransportInfo`, `GetTransportSettings`, `Next`, `Pause`, `Play`, `Previous`, `Seek`, `SetAVTransportURI`, `SetPlayMode`, `Stop` |
| `/RenderingControl/action` | `GetMute`, `GetVolume`, `GetVolumeDB`, `GetVolumeDBRange`, `ListPresets`, `SelectPreset`, `SetMute`, `SetVolume` |
| `/ConnectionManager/action` | `GetCurrentConnectionInfo`, `GetProtocolInfo`, `GetCurrentConnectionIDs` |

Handler method naming: `{Service}_{Action}`, e.g. `AVTransport_SetAVTransportURI`, `RenderingControl_SetVolume`. If no explicit handler method exists, the protocol auto-generates a response from state variables.

## mpv IPC Protocol

MPVRenderer communicates with mpv via JSON IPC:

- **Windows**: Named pipe `\\.\pipe\macast_mpvsocket{rand}`
- **macOS/Linux**: Unix domain socket `/tmp/macast_mpvsocket{rand}`

### Commands sent to mpv

JSON IPC command format: `{"command": [<name>, <arg0>, <arg1>, ...]}\n`

```
loadfile <url> replace 0 start=<seconds>   # Start playback (index=0 required before options)
set_property volume <0-100>
set_property pause true|false
set_property mute yes|no
set_property title <string>
set_property speed <0.01-100>
set_property sub-visibility yes|no
seek <position> absolute
stop
observe_property <id> <name>               # Register state observation
show-text <message> <duration_ms>
sub-add <url> select <title>
```

### Events received from mpv (JSON)

| Event | Maps to |
|---|---|
| `start-file` | → `renderer_av_uri` bus event, copy-URI menu item |
| `end-file` (reason=eof) | → `set_state_eof()` |
| `end-file` (reason=error) | → `set_state_transport_error()` |
| `end-file` (other) | → `set_state_stop()` |
| `idle` | → `set_state_stop()` |
| `playback-restart` | → `set_state_play()` or `set_state_pause()` |

### mpv startup parameters

```
mpv --input-ipc-server=<pipe/socket> --image-display-duration=inf
    --idle=yes --no-terminal --on-all-workspaces --hwdec=yes
    --save-position-on-quit=yes
    --script-opts=osc-timetotal=yes,osc-layout=bottombar,...
    [--ontop] [--geometry=X%:Y%] [--autofit=N%] [--fullscreen]
```

## SSDP Discovery Protocol

UDP multicast on `239.255.255.250:1900`.

- Device types announced: `rootdevice`, `MediaRenderer:1`, `RenderingControl:1`, `ConnectionManager:1`, `AVTransport:1`
- NOTIFY interval: every 3 seconds (via CherryPy Monitor)
- IP change detection: every 30 seconds; re-registers all devices on change
- M-SEARCH response: unicast UDP back to requester with device location URL
- Multicast membership managed per-interface via `netifaces`

## Settings System

Settings stored at `~/.config/Macast/macast_setting.json` (platform-specific via `appdirs`):

| Key | Type | Default | Description |
|---|---|---|---|
| `USN` | string | UUID | Unique device identifier |
| `CheckUpdate` | int | 1 | Auto check for updates |
| `StartAtLogin` | int | 0 | Launch at system startup |
| `MenubarIcon` | int | 0 (1 on macOS) | Icon style (0=AppIcon, 1/2=Pattern) |
| `ApplicationPort` | int | 0 (auto) | HTTP server port |
| `DLNA_FriendlyName` | string | "Macast(HOSTNAME)" | Name shown to DLNA clients |
| `Macast_Renderer` | string | "MPV Renderer" | Active renderer plugin |
| `Macast_Protocol` | string | "DLNA Protocol" | Active protocol plugin |
| `Blocked_Interfaces` | list | [] | Network interfaces to ignore |
| `Additional_Interfaces` | list | [] | Extra interface IPs to bind |

MPV-specific settings (stored separately with integer keys 100-500):
`PlayerHW` (100), `PlayerSize` (200), `PlayerPosition` (300), `PlayerOntop` (400), `PlayerDefaultVolume` (500).

## Plugin System

Custom plugins are Python files placed in:
- `{SETTING_DIR}/renderer/` — custom media renderers
- `{SETTING_DIR}/protocol/` — custom DLNA protocols

Plugin metadata via XML-style comments in the `.py` file:
```python
# <macast.title>My Plugin</macast.title>
# <macast.renderer>MyRenderer</macast.renderer>
# <macast.platform>darwin,win32,linux</macast.platform>
```

Plugins are auto-discovered on startup. Users can also install them from the settings web UI by providing a GitHub repo URL.

## Internationalization (i18n)

Gettext-based. PO files at `i18n/{locale}/LC_MESSAGES/macast.po`. Must be compiled to `.mo` before packaging:

```bash
pip install polib
python -c "
import polib
po = polib.pofile('i18n/zh_CN/LC_MESSAGES/macast.po')
po.save_as_mofile('i18n/zh_CN/LC_MESSAGES/macast.mo')
"
```

Locales: `zh_CN`, `fi`, `it`.

## Key Files

| File | Lines | Purpose |
|---|---|---|
| `Macast.py` | 61 | Entry point: locale, mpv path, launch gui |
| `macast/macast.py` | 519 | Main app class, plugin manager, tray menu, gui/cli entry |
| `macast/gui.py` | 365 | Cross-platform GUI abstraction (rumps/pystray) |
| `macast/protocol.py` | 1067 | DLNA/UPnP protocol, SOAP handling, state machine |
| `macast/server.py` | 192 | CherryPy HTTP server, Service orchestrator |
| `macast/plugin.py` | 177 | CherryPy plugins (Renderer, Protocol, SSDP) |
| `macast/ssdp.py` | 324 | SSDP/UDP multicast discovery |
| `macast/utils.py` | 431 | Settings persistence, IP detection, helpers |
| `macast/renderer.py` | 213 | Abstract renderer base class |
| `macast_renderer/mpv.py` | 646 | mpv renderer: process management, JSON IPC |
| `hook-pystray.py` | 14 | PyInstaller hook for pystray hidden imports |
| `macast/xml/*.xml` | — | DLNA service description XMLs |
| `macast/xml/setting.html` | 662 | Vue.js embedded settings page |

## Debugging PyInstaller Builds

The GUI exe (`-w` flag) has no console, so Python's standard `logging` output goes nowhere. CherryPy's `log.access_file` / `log.error_file` only capture CherryPy's own log messages — not custom logger output from `MPVRenderer`, `PLUGIN`, etc.

`Macast.py` configures a Python `FileHandler` early in startup to capture all `logging` messages into `macast_debug.log` alongside the CherryPy access log:

```
{appdirs.user_data_dir}/macast.log          # CherryPy access/error log
{appdirs.user_data_dir}/macast_debug.log    # Python logging (MPVRenderer, Protocol, etc.)
```

Check `macast_debug.log` first when diagnosing startup, mpv, or IPC issues.

### Common build issues

| Symptom | Root Cause | Fix |
|---|---|---|
| `FileNotFoundError: .../macast/xml/setting.html` | PyInstaller glob `macast/xml/*` skips `.html` files | Use directory mode: `--add-data="macast/xml;macast/xml"` |
| `FileNotFoundError: .../macast_debug.log` | `SETTING_DIR` doesn't exist at startup | `os.makedirs(SETTING_DIR, exist_ok=True)` before creating `FileHandler` |
| mpv silent / no response after `loadfile` | Missing `index` arg in IPC command — `start=0` parsed as integer index, mpv rejects | Format: `['loadfile', url, 'replace', 0, 'start=0']` (4th arg is `index`, 5th is `options`) |
| `PermissionError` on `dist/Macast.exe` during rebuild | Previous Macast.exe still running | Kill with `taskkill /f /im Macast.exe` before rebuild |
| Assets / fonts 404 in web UI | Glob `macast/assets/*` doesn't recurse into `fonts/` | Use directory mode: `--add-data="macast/assets;macast/assets"` |
| Missing translations for `fi`/`it` | Only `zh_CN` was included in `--add-data` | Use directory mode: `--add-data="i18n;i18n"` |

## Git-tracked Open Source Forks

The project uses xfangfang's forks of `pystray` and `pyperclip` (for Linux compatibility). These are cloned into `vendor/`:

```bash
mkdir -p vendor
cd vendor
git clone https://github.com/xfangfang/pystray.git
git clone https://github.com/xfangfang/pyperclip.git
```

## Web Renderer 2 — 浏览器投屏播放模块

> **新增于 2026-05-02** | 独立模块，零侵入 Macast 核心代码

### 模块定位

Web Renderer 2 是一个**独立模块**（`web_renderer_2/`），不是修改 Macast 源码。它在 `0.0.0.0:2554` 端口部署 Node.js + React 服务，允许多个浏览器客户端同时观看 DLNA 投屏内容，各客户端独立控制播放。

核心流程：`DLNA投屏 → Macast (Renderer插件) → HTTP POST → Node.js → WebSocket → 浏览器播放`

### 架构

```
web_renderer_2/
├── macast_renderer.py         # Renderer 插件源文件（含 subprocess + MEIPASS 自动释放）
├── deploy.ps1                 # 独立部署脚本（构建+部署到 SETTING_DIR，支持 staging 模式）
├── server/                    # Node.js Express + TypeScript 服务端
│   └── src/
│       ├── index.ts           # 入口：Express + WebSocket + 静态文件
│       ├── config.ts          # 常量：PORT=2554, HEARTBEAT等
│       ├── types.ts           # CastMedia, DeviceInfo, WS消息类型
│       ├── routes/api.ts      # REST: POST /api/cast, GET /api/status等
│       ├── services/
│       │   ├── CastService.ts     # URL验证 + 格式识别 + 内存存储
│       │   └── SessionManager.ts  # WS会话管理 + UA解析 + 心跳超时
│       ├── websocket/
│       │   ├── WsServer.ts        # ws.Server生命周期 + 超时扫描
│       │   └── handlers.ts        # ping/cast:request/player:status路由
│       └── middleware/
│           ├── logger.ts          # 请求日志
│           └── errorHandler.ts    # 统一错误处理
├── client/                    # React 18 + TypeScript + Redux Toolkit
│   └── src/
│       ├── index.tsx          # Redux Provider入口
│       ├── App.tsx            # 根布局：顶部状态栏 + 播放器 + 输入栏
│       ├── store/
│       │   ├── index.ts       # Redux Store配置
│       │   ├── playerSlice.ts # 播放器状态（9字段, 14 actions）
│       │   └── userSlice.ts   # 在线用户状态（WS同步）
│       ├── components/        # VideoPlayer, CastInput, StatusOverlay, UserIndicator
│       ├── hooks/             # useWebSocket, useKeyboard, useVideoEvents
│       └── styles/            # CSS设计Token + 播放器暗色主题 + 响应式
└── README.md

运行时部署目录（{SETTING_DIR} = %LOCALAPPDATA%\xfangfang\Macast）：
{SETTING_DIR}/
├── renderer/
│   ├── __init__.py
│   └── web_renderer_2.py      # ← 插件文件（Macast 自动发现）
│                                #   来源：deploy.ps1 复制 或 PyInstaller exe 首次运行自动释放
└── web_renderer_2_app/         #   Node.js 应用文件
    │                            #   来源：deploy.ps1 部署 或 从 sys._MEIPASS 自动释放
    ├── server/
    │   ├── package.json        # 生产依赖声明
    │   ├── dist/               # TS→JS 编译产物
    │   └── node_modules/       # express, ws, cors（npm install --omit=dev 自动安装）
    └── client/
        └── dist/               # Vite 构建的 React SPA
```

### 与 Macast 的集成方式

**Web Renderer 2 作为 Macast 自定义渲染器插件运行，零侵入 Macast 核心代码。** 利用已有的插件系统（`MacastPluginManager`）和渲染器切换机制（`on_renderer_change_click`）实现。

#### Macast 插件加载机制（关键依赖）

> **设计记录**：此模块完全依赖 Macast 已有的插件发现机制来加载和切换。以下详述 Macast 的插件加载流程，供后续维护参考。

**插件发现时机** — `Macast.__init__()` → `MacastPluginManager.__init__()`（`macast/macast.py:99-108`）：

```python
class MacastPluginManager:
    def __init__(self, renderer_default, protocol_default):
        sys.path.append(SETTING_DIR)              # ①添加到Python搜索路径
        self.create_plugin_dir(RENDERER_DIR)       # ②确保 renderer/ 目录存在
        self.create_plugin_dir(PROTOCOL_DIR)
        self.renderer_list = [renderer_default]    # ③默认渲染器（MPV）
        self.renderer_list += self.load_macast_plugin(RENDERER_DIR)  # ④扫描自定义插件
```

**插件扫描** — `load_macast_plugin('renderer')`（`macast/macast.py:139-154`）：
```
扫描 {SETTING_DIR}/renderer/*.py（排除 __init__.py）
        │
        ▼ 对每个 .py 文件
  1. MacastPlugin(path) — 读取文件，正则提取XML元数据
        │  <macast.renderer>ClassName</macast.renderer>
        │  <macast.title>Display Name</macast.title>
        │  <macast.platform>win32,linux,darwin</macast.platform>
        │
  2. load_from_file() — importlib.import_module('renderer.filename')
        │  → 获取模块中的 ClassName 引用（plugin_class）
        │
  3. check() — 验证 plugin_class 非空 且 sys.platform 在 platform 中
        │
  4. 通过 → 追加到 renderer_list
```

**渲染器切换** — `on_renderer_change_click(item)`（`macast/macast.py:449-461`）：
```python
def on_renderer_change_click(self, item):
    renderer_config = self.plugin_manager.renderer_list[item.data]
    self.service.renderer = renderer_config.get_instance()  # ← 触发热切换
    Setting.set(SettingProperty.Macast_Renderer, renderer_config.title)
    # Rebuild tray menu
```

`service.renderer` 的 setter（`macast/server.py:131`）调用 `RendererPlugin.set_renderer()`，后者执行：
1. `old_renderer.stop()` — 停止旧渲染器（MPV进程/IPC线程）
2. `new_renderer.start()` — 启动新渲染器
3. 重新订阅所有 `set_media_*` 方法到 CherryPy 总线

**菜单可见性条件**（`macast/macast.py:253-265`）：
```python
renderer_names = [r.title for r in self.plugin_manager.renderer_list]
if len(renderer_names) > 1:        # 至少2个渲染器时才显示Renderers子菜单
    self.renderer_menuitem = MenuItem(_("Renderers"),
        children=App.build_menu_item_group(renderer_names, ...))
```

#### 1. 渲染器插件实现（`macast.renderer.Renderer` 子类）

实现全部 12 个 `set_media_*` 方法。核心方法 `set_media_url()` 将 DLNA 投屏 URL 通过 HTTP POST 转发到 Node.js 服务（`http://127.0.0.1:2554/api/cast`），其余方法为空操作（浏览器客户端独立控制播放）。

插件文件以 XML 注释嵌入元数据：
```python
# <macast.renderer>WebRenderer2</macast.renderer>
# <macast.title>Web Renderer 2</macast.title>
# <macast.platform>win32,linux,darwin</macast.platform>
```

#### 2. 运行时部署

插件文件部署到 Macast 用户配置目录（不修改项目源码）：
```
{SETTING_DIR}/renderer/web_renderer_2.py
```
- Windows: `%LOCALAPPDATA%\xfangfang\Macast\renderer\`
- macOS: `~/Library/Application Support/Macast/renderer/`
- Linux: `~/.config/Macast/renderer/`

项目中也保留一份副本 `web_renderer_2/macast_renderer.py` 供参考和手动部署。

#### 3. 完整切换流程

```
右键托盘 → Settings → Renderers 子菜单
    ├── MPV Renderer       (默认, checked)
    └── Web Renderer 2     (选择后切换)
           │
           ▼  on_renderer_change_click(item)
           │
           ├── plugin_config.renderer_list[item.data] → MacastPlugin
           ├── plugin.get_instance() → WebRenderer2()   (首次懒实例化)
           ├── service.renderer = wr2_instance
           │     └── RendererPlugin.set_renderer()
           │           ├── old_renderer.stop()   (停止MPV进程, 终止IPC)
           │           ├── new_renderer.methods() → 12个set_media_*方法
           │           ├── bus.subscribe()       (注册到CherryPy总线)
           │           └── new_renderer.start()  (启动WebRenderer2)
           │
           └── Setting.set(Macast_Renderer, "Web Renderer 2")   (持久化)
```

DLNA投屏到达时的数据流：
```
CherryPy SOAP Handler (DLNAProtocol.AVTransport_SetAVTransportURI)
    │
    └→ cherrypy.engine.publish('set_media_url', url)
           │
           └→ WebRenderer2.set_media_url(url)
                  │
                  └→ requests.post('http://127.0.0.1:2554/api/cast', ...)
                         │
                         └→ Node.js Express → CastService → WS广播 cast:new
```

### 方案演进记录

> **初版（已废弃）：Bridge 模式** — 在 `macast/protocol.py` 的 `AVTransport_SetAVTransportURI` 中插入 `bridge.forward_cast()`。问题：(1) 侵入 Macast 核心协议层；(2) 无法通过菜单开关；(3) 与 mpv 渲染器并存浪费资源。**文件已删除。**

> **第二版（已废弃）：手动注册模式** — 在 `macast/macast.py` 的 `gui()` 中用 `MacastPlugin(None, ...)` 手动注入渲染器。问题：pystray 菜单在部分平台上渲染为灰色不可选。**代码已还原。**

> **当前版本：文件型插件 + Python 托管进程 + 自动释放** — 插件文件部署到 `{SETTING_DIR}/renderer/` 由 Macast 原生发现；选中渲染器时 `start()` 自动启动 Node.js 子进程，切换离开时 `stop()` 自动终止。从 PyInstaller exe 运行时，自动将内置的应用文件释放到 `SETTING_DIR` 并安装 npm 依赖。优势：(1) 利用 Macast 插件发现机制，零源码修改；(2) 进程生命周期与渲染器绑定，不浪费资源；(3) 菜单可靠显示；(4) 发行版可自包含，无需用户手动部署。

### 运行与部署

**方式一：集成构建（推荐用于发行版）**
```powershell
# build.ps1 新增 -WithWebRenderer 开关，一站式构建
.\build.ps1 -WithWebRenderer
# → 构建 Macast.exe + 内置 Web Renderer 2
# → 首次运行时自动释放到 SETTING_DIR
```

**方式二：独立部署（推荐用于开发调试）**
```powershell
# 在项目根目录执行 — 构建 + 打包 + 安装依赖
.\web_renderer_2\deploy.ps1

# 跳过构建（已手动 npm run build 时使用）
.\web_renderer_2\deploy.ps1 -SkipBuild

# 跳过 npm install（依赖已安装时使用）
.\web_renderer_2\deploy.ps1 -SkipNpmInstall

# 仅创建 PyInstaller staging 目录（供 build.ps1 使用）
.\web_renderer_2\deploy.ps1 -StagingDir "web_renderer_2\staging"
```

**手动部署步骤**：
```bash
# 1. 构建
cd web_renderer_2/client && npm install && npm run build
cd ../server && npm install && npm run build

# 2. 复制构建产物到 SETTING_DIR
SETTING_DIR="$LOCALAPPDATA/xfangfang/Macast"   # Windows
APP_DIR="$SETTING_DIR/web_renderer_2_app"
mkdir -p "$APP_DIR/server/dist" "$APP_DIR/client/dist"
cp -r server/dist/* "$APP_DIR/server/dist/"
cp -r client/dist/* "$APP_DIR/client/dist/"
cp server/package.json "$APP_DIR/server/"

# 3. 安装运行时依赖
cd "$APP_DIR/server" && npm install --omit=dev

# 4. 部署插件文件
cp macast_renderer.py "$SETTING_DIR/renderer/web_renderer_2.py"
```

**启动 Macast**（无需手动启动 Node.js）：
```bash
source .venv/Scripts/activate && python Macast.py
# → 右键托盘 → Settings → Renderers → Web Renderer 2
# → Python 自动启动 Node.js 服务（subprocess.Popen）
# → 浏览器访问 http://局域网IP:2554
```

### 服务生命周期（Python 管理）

`WebRenderer2` 通过 `subprocess` 管理 Node.js 进程，支持两种部署模式自动适配：

```
选中 Web Renderer 2
    │
    ▼
start()
    ├── _check_node()         → 检测 node 命令是否可用
    ├── _check_server_dir()   → 检测 SETTING_DIR 中 dist/index.js 是否存在
    │     └── 缺失时:
    │           ├── 从 sys._MEIPASS (PyInstaller 临时目录) 提取 → _extract_bundled_app()
    │           └── 或报错提示运行 deploy.ps1
    ├── _ensure_deps()        → 检测 node_modules 是否存在，缺失时自动 npm install --omit=dev
    ├── subprocess.Popen(['node', 'dist/index.js'], cwd=SERVER_DIR)
    ├── _wait_for_server(10s) → 轮询 /api/status 直到就绪
    └── _open_browser(url)    → 自动打开浏览器到 http://127.0.0.1:2554
           ├── macOS: subprocess.Popen(['open', url])
           ├── Windows: webbrowser.open(url)
           └── Linux: subprocess.Popen(['xdg-open', url])

切换到其他渲染器 / 退出 Macast
    │
    ▼
stop()
    ├── Windows: taskkill /f /t /pid {pid}
    └── Unix:    terminate() → wait(5s) → kill()

RendererPlugin 热切换（macast/plugin.py:51-56）：
    old_renderer.stop() → 切换到新渲染器 → new_renderer.start()
```

**两种部署模式**：
- **独立部署**（`deploy.ps1`）：插件 + Node.js 应用直接部署到 `SETTING_DIR`，适用于源码运行 `python Macast.py`
- **集成构建**（`build.ps1 -WithWebRenderer`）：应用打包进 PyInstaller exe，首次运行时自动释放到 `SETTING_DIR` 并安装 npm 依赖

### REST API

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/cast` | 接收投屏链接 → 验证 → 广播 `cast:new` |
| `GET` | `/api/cast` | 获取当前投屏信息 |
| `GET` | `/api/users` | 在线用户统计 |
| `GET` | `/api/status` | 健康检查 (uptime, hasMedia, onlineCount) |

### WebSocket 协议

| 方向 | type | 触发时机 |
|------|------|----------|
| S→C | `cast:new` | 新投屏到达（全体广播） |
| C→S | `cast:request` | 新客户端连接时主动请求 |
| S→C | `cast:current` | 返回当前投屏 |
| S→C | `user:status` | 用户连接/断开/超时 |
| C→S | `ping` / S→C `pong` | 30s心跳 / 60s超时断开 |

### 关键设计约束

- **单视频模式**：新投屏链接覆盖旧链接，不维护播放历史
- **播放各自独立**：WS仅同步投屏URL，各客户端的播放/暂停/进度/音量互不影响
- **格式自动识别**：URL后缀 `.mp4`→mp4, `.webm`→webm, `.m3u8`→hls, `.mpd`→dash, 其他→unknown（不阻塞加载）
- **HLS需要hls.js**：Safari原生支持，其他浏览器通过hls.js按需加载
- **加载超时15秒**：超时后显示错误界面并提供重试按钮
- **WebSocket指数退避重连**：1s→2s→4s→...→30s，无次数限制

### 性能指标

| 指标 | 目标值 | 实际 |
|------|--------|------|
| 前端产物体积 (gzip) | <200KB | ~64KB |
| 视频首帧 | ≤3s | 取决于网络 |
| API响应 | ≤300ms | <10ms (内存) |
| WS同步延迟 | ≤500ms | 局域网<10ms |

---

## Notes

- **Always compile `.po` to `.mo`** before running or packaging, otherwise i18n won't work
- **Always use `.venv`** — makes dependency management reproducible
- **`pywin32` is required on Windows** but was historically missing from `requirements/common.txt` and `setup.py` (now fixed)
- **mpv IPC on Windows uses named pipes** (`_winapi.CreateFile`). The pipe path `\\.\pipe\macast_mpvsocket{rand}` is a Windows namespace path — do NOT wrap it with `Setting.get_base_path()` or `os.path.join` will corrupt it.
- **mpv IPC `loadfile` requires the `index` parameter** before `options`: `['loadfile', url, 'replace', 0, 'start=0']`. Omitting `index` (passing options as the 3rd arg) causes mpv to silently reject the command.
- **`AutoPortServer`** falls back to a random port if the preferred port is occupied; generates a new USN and temporary friendly name when port changes
- **The app blocks on `cherrypy.engine.block()`** in `Service.run()`; `run_async()` wraps it in a thread
- **`communicate()` blocks** in `start_mpv()` — mpv runs until it exits, then restarts if IPC was never connected
- Settings JSON is flat (not nested), using integer keys for MPV-specific settings to avoid collision
- On macOS, the app uses `LSUIElement: true` (menu bar only, no Dock icon)
