# Web Renderer 2

Web Renderer 2 is a browser-based cast receiver and video player for Macast. It deploys a Node.js web server that receives DLNA cast URLs from the Macast Python core and streams them to multiple browser clients in real time via WebSocket. Each client plays independently with its own playback controls.

## Architecture

```
Macast Python (CherryPy)
    │
    │  DLNA SetAVTransportURI
    │  → HTTP POST /api/cast
    ▼
Node.js Express Server (port 2554)
    │
    ├── REST API: cast reception, user stats, health check
    ├── WebSocket Server: real-time cast broadcast
    └── Static Files: React SPA
          │
          ▼
    Browser Clients (Chrome / Firefox / Safari / Edge)
```

## Quick Start

### Prerequisites

- Node.js >= 18 LTS
- npm >= 9

### Install & Run

```bash
# Server
cd server
npm install
npm run build
npm start        # Starts on http://0.0.0.0:2554

# Client (dev mode)
cd client
npm install
npm run dev      # Starts on http://localhost:3000 (proxies to :2554)

# Client (production build)
cd client
npm run build    # Outputs to client/dist (served by server)
```

### Development

```bash
# Server in dev mode (auto-restart with ts-node)
cd server && npm run dev

# Client in dev mode (HMR with Vite)
cd client && npm run dev

# Run tests
cd server && npm test
cd client && npm test
```

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/cast` | Receive a cast URL (from Macast or manual input) |
| `GET` | `/api/cast` | Get current cast media info |
| `GET` | `/api/users` | Get online user statistics |
| `GET` | `/api/status` | Health check (uptime, media status, user count) |

### WebSocket Messages

| Direction | Type | Description |
|-----------|------|-------------|
| C→S | `ping` | Heartbeat (every 30s) |
| S→C | `pong` | Heartbeat response |
| S→C | `cast:new` | New cast URL broadcast |
| C→S | `cast:request` | Request current cast info |
| S→C | `cast:current` | Current cast info response |
| S→C | `user:status` | Online user list update |

## Integration with Macast

The bridge module at `web_renderer_2/bridge.py` forwards DLNA cast URLs from the Python core to this service. The bridge is called automatically from `macast/protocol.py` when a DLNA client sends `SetAVTransportURI`. If the Web Renderer 2 service is not running, it fails silently.

## Supported Video Formats

| Format | Extension | Browser Support |
|--------|-----------|-----------------|
| MP4 | `.mp4` | All modern browsers (native) |
| WebM | `.webm` | Chrome, Firefox, Edge (Safari not supported) |
| HLS | `.m3u8` | Safari (native), others via hls.js |
| DASH | `.mpd` | Via dash.js |

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
├── server/                    # Node.js + Express + TypeScript
│   └── src/
│       ├── index.ts           # Entry point
│       ├── config.ts          # Configuration constants
│       ├── types.ts           # Shared type definitions
│       ├── websocket/         # WebSocket server and handlers
│       ├── routes/            # REST API routes
│       ├── services/          # CastService, SessionManager
│       └── middleware/        # Logger, error handler
├── client/                    # React 18 + TypeScript + Redux
│   └── src/
│       ├── index.tsx          # App entry with Redux Provider
│       ├── App.tsx            # Root layout
│       ├── store/             # Redux slices (player, user)
│       ├── components/        # VideoPlayer, CastInput, etc.
│       ├── hooks/             # useWebSocket, useKeyboard, useVideoEvents
│       ├── services/          # API client
│       └── styles/            # CSS design system
├── bridge.py                  # Macast Python bridge module
└── README.md
```

## License

GPL-3.0 (same as Macast)
