# Web Renderer 2

Web Renderer 2 is a browser-based cast receiver and video player for Macast. It runs a Python aiohttp web server that receives DLNA cast URLs from the Macast Python core and streams them to multiple browser clients in real time via WebSocket. Each client plays independently with its own playback controls.

## Architecture

```
Macast Python (CherryPy)
    │
    │  DLNA SetAVTransportURI
    │  → HTTP POST /api/cast
    ▼
Python aiohttp Server (port 2554)   [no Node.js runtime required]
    │
    ├── REST API: cast reception, user stats, health check, media proxy
    ├── WebSocket Server: real-time cast broadcast
    └── Static Files: React SPA
          │
          ▼
    Browser Clients (Chrome / Firefox / Safari / Edge)
```

## Quick Start

### Prerequisites

- Python >= 3.6 with `aiohttp` (bundled with Macast's venv)
- Node.js >= 18 + npm (only for building the React client, not at runtime)

### Build & Run

```bash
# Build the React client (one-time, outputs to client/dist)
cd client
npm install
npm run build

# Run via Macast — start Macast and select Web Renderer 2 in the tray menu.
# The Python server is launched automatically by the renderer plugin; no
# separate `npm start` step is needed.
```

### Development

```bash
# Client in dev mode (HMR with Vite, proxies to :2554)
cd client && npm run dev

# Run the Python server standalone for debugging
python -c "from web_renderer_2.server_py.server import run_server; \
           run_server('web_renderer_2/client/dist')"
```

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/cast` | Receive a cast URL (from Macast or manual input) |
| `GET` | `/api/cast` | Get current playlist |
| `DELETE` | `/api/cast/{index}` | Remove a playlist item |
| `POST` | `/api/cast/reorder` | Reorder playlist items |
| `GET` | `/api/users` | Get online user statistics |
| `GET` | `/api/status` | Health check (uptime, media status, user count) |
| `GET` | `/proxy/{media_id}` | Stream media from CDN with browser-like headers |

### WebSocket Messages

| Direction | Type | Description |
|-----------|------|-------------|
| C→S | `ping` | Heartbeat (every 30s) |
| S→C | `pong` | Heartbeat response |
| S→C | `cast:new` | New cast URL broadcast |
| C→S | `cast:request` | Request current playlist |
| S→C | `playlist:updated` | Full playlist refresh (after add/delete/reorder/probe) |
| S→C | `user:status` | Online user list update |

## Integration with Macast

Web Renderer 2 runs as a Macast custom renderer plugin (`macast_renderer.py`), discovered by Macast's plugin manager from `{SETTING_DIR}/renderer/`. When the user selects "Web Renderer 2" in the tray menu, the plugin launches the Python aiohttp server in a daemon thread and opens a browser. DLNA `SetAVTransportURI` calls are forwarded to `POST /api/cast` immediately — no core Macast source modifications are required.

## Supported Video Formats

| Format | Extension | Browser Support |
|--------|-----------|-----------------|
| MP4 | `.mp4` | All modern browsers (native) |
| WebM | `.webm` | Chrome, Firefox, Edge (Safari not supported) |
| HLS | `.m3u8` | Safari (native), others via hls.js |
| DASH | `.mpd` | Via dash.js |
| Unknown | extensionless | Streamed via `/proxy/{id}` with probed Content-Type |

## Browser Compatibility

| Feature | Chrome 90+ | Firefox 88+ | Safari 14+ | Edge 90+ |
|---------|-----------|-------------|-----------|---------|
| MP4 | Yes | Yes | Yes | Yes |
| WebM | Yes | Yes | No | Yes |
| HLS (hls.js) | Yes | Yes | Yes (native) | Yes |
| Fullscreen API | Yes | Yes | Yes (-webkit-) | Yes |
| WebSocket | Yes | Yes | Yes | Yes |

## Directory Structure

```
web_renderer_2/
├── macast_renderer.py         # Renderer plugin (launches Python server in a thread)
├── server_py/                 # Python aiohttp server (runtime)
│   ├── server.py              # HTTP + WebSocket + proxy + health checker
│   ├── cast_service.py        # Playlist storage, URL validation, Content-Type probe
│   └── config.py              # Constants (PORT=2554, timeouts, etc.)
├── client/                    # React 18 + TypeScript + Redux (build-only)
│   └── src/
│       ├── index.tsx          # App entry with Redux Provider
│       ├── App.tsx            # Root layout
│       ├── store/             # Redux slices (player, playlist, user)
│       ├── components/        # VideoPlayer, CastInput, Playlist, etc.
│       ├── hooks/             # useWebSocket, useKeyboard, useVideoEvents
│       ├── services/          # API client
│       └── styles/            # CSS design system
├── deploy.ps1                 # Build + deploy to SETTING_DIR (or staging for PyInstaller)
└── README.md
```

## License

GPL-3.0 (same as Macast)
