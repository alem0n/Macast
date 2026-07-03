"""
Web Renderer 2 — Python HTTP + WebSocket server.

Replaces the Node.js Express + ws server. Uses aiohttp for both
HTTP (REST API, static files, SPA fallback) and WebSocket.

Started in-process by the Macast renderer plugin via a daemon thread.
"""
import asyncio
import json
import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from email.utils import formatdate

import aiohttp
from aiohttp import web

from . import cast_service
from .config import (
    HOST, PORT,
    HEARTBEAT_INTERVAL_MS, HEARTBEAT_TIMEOUT_MS, HEARTBEAT_SCAN_INTERVAL_MS,
    MAX_CONNECTIONS,
    HEALTH_CHECK_INTERVAL_S, HEALTH_CHECK_TIMEOUT_S,
    HEALTH_CHECK_MAX_CONCURRENT, HEALTH_CHECK_MAX_FAILS,
)

logger = logging.getLogger("WebRenderer2.Server")

# ── global state ──────────────────────────────────────────────────

_start_time = 0.0
_runner = None      # web.AppRunner
_loop = None        # asyncio event loop
_stop_event = None  # asyncio.Event set when server should stop
_bg_tasks = set()   # background asyncio tasks

# WebSocket sessions: session_id → {id, ws, device_info, last_heartbeat}
_sessions = {}

# Health checker state
_fail_counts = {}   # url → consecutive failures
_health_running = False


# ── session helpers ───────────────────────────────────────────────

def _parse_ua(ua):
    browser = 'Unknown'
    if 'Edg' in ua:
        browser = 'Edge'
    elif 'Chrome' in ua:
        browser = 'Chrome'
    elif 'Firefox' in ua:
        browser = 'Firefox'
    elif 'Safari' in ua:
        browser = 'Safari'

    device_type = 'Desktop'
    if re.search(r'Mobile|Android|iPhone', ua, re.IGNORECASE):
        device_type = 'Mobile'
    elif re.search(r'iPad|Tablet', ua, re.IGNORECASE):
        device_type = 'Tablet'

    return browser, device_type


def _add_session(ws, user_agent):
    sid = str(uuid.uuid4())
    browser, device_type = _parse_ua(user_agent)

    session = {
        'id': sid,
        'ws': ws,
        'device_info': {
            'deviceId': sid,
            'deviceType': device_type,
            'browser': browser,
            'connectedAt': datetime.now(timezone.utc).isoformat(),
        },
        'lastHeartbeat': time.time(),
    }
    _sessions[sid] = session
    logger.info("[WS] session added id=%s browser=%s device=%s total=%d",
                sid, browser, device_type, len(_sessions))
    return session


def _remove_session(sid):
    session = _sessions.pop(sid, None)
    if session:
        logger.info("[WS] session removed id=%s total=%d", sid, len(_sessions))
    return session


def _update_heartbeat(sid):
    session = _sessions.get(sid)
    if session:
        session['lastHeartbeat'] = time.time()


def _get_online_stats():
    devices = [s['device_info'] for s in _sessions.values()]
    return {'onlineCount': len(devices), 'devices': devices}


def _broadcast(message):
    """Send a JSON message to all connected WebSocket clients."""
    data = json.dumps(message)
    dead = []
    for sid, session in _sessions.items():
        ws = session['ws']
        if ws.closed:
            dead.append(sid)
        else:
            try:
                asyncio.create_task(ws.send_str(data))
            except Exception:
                dead.append(sid)
    for sid in dead:
        _remove_session(sid)
    if dead:
        _broadcast_user_status()


def _send_to_session(sid, message):
    session = _sessions.get(sid)
    if session and not session['ws'].closed:
        try:
            asyncio.create_task(session['ws'].send_str(json.dumps(message)))
        except Exception:
            pass


def _check_timeouts():
    now = time.time()
    timed_out = []
    for sid, session in _sessions.items():
        if now - session['lastHeartbeat'] > (HEARTBEAT_TIMEOUT_MS / 1000):
            timed_out.append(sid)

    for sid in timed_out:
        session = _sessions.get(sid)
        if session:
            logger.info("[WS] heartbeat timeout id=%s", sid)
            try:
                asyncio.create_task(session['ws'].close())
            except Exception:
                pass
            _remove_session(sid)

    return timed_out


def _broadcast_user_status():
    stats = _get_online_stats()
    _broadcast({'type': 'user:status', 'payload': stats})


def _broadcast_playlist():
    items = cast_service.get_playlist()
    _broadcast({'type': 'playlist:updated', 'payload': {'items': items}})


def _find_session_by_ws(ws):
    for session in _sessions.values():
        if session['ws'] is ws:
            return session
    return None


# ── WebSocket handler ─────────────────────────────────────────────

async def _handle_ws(request):
    """aiohttp WebSocket route handler."""
    ws = web.WebSocketResponse(max_msg_size=64 * 1024)
    await ws.prepare(request)

    user_agent = request.headers.get('User-Agent', 'Unknown')
    session = _add_session(ws, user_agent)

    if len(_sessions) > MAX_CONNECTIONS:
        logger.warning("[WS] max connections (%d) exceeded, rejecting", MAX_CONNECTIONS)
        await ws.close(code=1013, message=b'Too many connections')
        return ws

    _broadcast_user_status()

    try:
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                await _ws_on_message(ws, msg.data)
            elif msg.type == aiohttp.WSMsgType.ERROR:
                logger.error("[WS] connection error: %s", ws.exception())
    finally:
        _handle_close(ws)

    return ws


async def _ws_on_message(ws, raw):
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        return

    msg_type = msg.get('type', '')

    if msg_type == 'ping':
        session = _find_session_by_ws(ws)
        if session:
            _update_heartbeat(session['id'])
        if not ws.closed:
            await ws.send_str(json.dumps({'type': 'pong', 'timestamp': int(time.time() * 1000)}))

    elif msg_type == 'cast:request':
        items = cast_service.get_playlist()
        logger.debug("[WS] cast:request — sending %d items", len(items))
        if not ws.closed:
            await ws.send_str(json.dumps({
                'type': 'playlist:updated',
                'payload': {'items': items},
            }))

    elif msg_type == 'player:status':
        # Reserved for future use
        pass


def _handle_close(ws):
    session = _find_session_by_ws(ws)
    if session:
        _remove_session(session['id'])
        _broadcast_user_status()


# ── REST API handlers ─────────────────────────────────────────────

def _log(prefix, msg, *args):
    logger.info("[%s] %s", prefix, msg % args if args else msg)


async def handle_cast_post(request):
    """POST /api/cast — receive a cast URL."""
    try:
        body = await request.json()
    except Exception:
        _log("API", "POST /api/cast | REJECTED — invalid JSON")
        return web.json_response({'error': 'Invalid JSON'}, status=400)

    url = body.get('url', '')
    if not url:
        _log("API", "POST /api/cast | REJECTED — missing url")
        return web.json_response({'error': 'Missing required field: url'}, status=400)

    validation = cast_service.validate_url(url)
    if not validation['valid']:
        _log("API", "POST /api/cast | REJECTED — invalid URL: %.80s", url)
        return web.json_response({'error': 'Invalid URL provided'}, status=400)

    # ── Content-Type probe for extensionless URLs (e.g. Douyin) ──
    mime_type = None
    if validation.get('format') == 'unknown':
        _log("API", "POST /api/cast | probing Content-Type for extensionless URL...")
        mime_type = await cast_service.probe_content_type(url)
        if mime_type:
            _log("API", "POST /api/cast | probed Content-Type=%s", mime_type)
        else:
            _log("API", "POST /api/cast | Content-Type probe returned nothing")

    _log("API", "POST /api/cast | source=%s title=\"%s\" url=%.80s",
         body.get('source', 'dlna'), body.get('title', ''), url)

    media = cast_service.add_to_playlist(body, mime_type)

    _broadcast({'type': 'cast:new', 'payload': media})
    _broadcast_playlist()

    return web.json_response({'success': True, 'media': media}, status=201)


async def handle_cast_get(request):
    """GET /api/cast — get full playlist."""
    return web.json_response({'playlist': cast_service.get_playlist()})


async def handle_cast_delete(request):
    """DELETE /api/cast/{index} — remove a playlist item."""
    try:
        idx = int(request.match_info['index'])
    except (ValueError, KeyError):
        _log("API", "DELETE /api/cast/:index | REJECTED — invalid index")
        return web.json_response({'error': 'Invalid index parameter'}, status=400)

    _log("API", "DELETE /api/cast/%d | request", idx)
    removed = cast_service.remove_item(idx)

    if removed is None:
        _log("API", "DELETE /api/cast/%d | REJECTED — out of range", idx)
        return web.json_response({'error': 'Invalid playlist index'}, status=400)

    _broadcast_playlist()
    _log("API", "DELETE /api/cast/%d | OK — removed id=%s", idx, removed['id'])
    return web.json_response({'success': True})


async def handle_cast_reorder(request):
    """POST /api/cast/reorder — reorder playlist."""
    try:
        body = await request.json()
    except Exception:
        return web.json_response({'error': 'Invalid JSON'}, status=400)

    from_idx = body.get('fromIndex')
    to_idx = body.get('toIndex')

    if from_idx is None or to_idx is None:
        return web.json_response(
            {'error': 'Missing required fields: fromIndex, toIndex'}, status=400)

    ok = cast_service.reorder(int(from_idx), int(to_idx))
    if not ok:
        return web.json_response({'error': 'Invalid index range'}, status=400)

    _broadcast_playlist()
    return web.json_response({'success': True})


async def handle_users(request):
    """GET /api/users — online user stats."""
    return web.json_response(_get_online_stats())


async def handle_status(request):
    """GET /api/status — health check."""
    stats = _get_online_stats()
    return web.json_response({
        'status': 'ok',
        'uptime': int(time.time() - _start_time) if _start_time else 0,
        'hasMedia': len(cast_service.get_playlist()) > 0,
        'onlineCount': stats['onlineCount'],
    })


# ── media proxy (for extensionless CDN URLs) ──────────────────────

async def handle_proxy(request):
    """GET /proxy/{media_id} — Stream media from the original CDN URL via local proxy.

    This solves playback issues with CDNs that:
    - Don't return proper Content-Type for extensionless URLs
    - Don't support HTTP Range requests required by <video> elements
    - Block cross-origin requests from the <video> element
    """
    media_id = request.match_info.get('media_id', '')
    media = cast_service.find_by_id(media_id)
    if not media:
        _log("Proxy", "NOT FOUND — id=%s", media_id)
        return web.json_response({'error': 'Media not found'}, status=404)

    original_url = media['url']
    mime_type = media.get('mimeType', 'video/mp4')
    range_header = request.headers.get('Range', '')

    _log("Proxy", "id=%s range=%s url=%.80s",
         media_id, range_header[:50] if range_header else '(none)', original_url)

    try:
        # Forward the request to the CDN with browser-like headers.
        # Many CDNs (Douyin, etc.) reject requests that don't appear
        # to come from a real browser (checking User-Agent, Referer, etc.)
        #
        # IMPORTANT: Do NOT forward the browser's Range header to the CDN.
        # Many CDNs (especially Chinese ones like Douyin) don't support
        # Range requests on extensionless URLs — they hang or error out.
        # Instead we fetch the full resource and serve it with proper
        # Content-Type. The browser's <video> element gets the full file
        # and handles seeking locally.
        req_headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            ),
            'Referer': 'https://www.douyin.com/',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        }

        _log("Proxy", "Fetching full resource (Range header NOT forwarded) ...")

        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        connector = aiohttp.TCPConnector(ssl=False)
        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
            async with session.get(original_url, headers=req_headers) as resp:
                _log("Proxy", "CDN response status=%s content-type=%s",
                     resp.status, resp.headers.get('Content-Type', '?'))

                # If the CDN returned an error, log and pass it through
                if resp.status >= 400:
                    body_preview = await resp.content.read(512)
                    _log("Proxy", "CDN ERROR — status=%s body=%.200s",
                         resp.status, body_preview.decode('utf-8', errors='replace'))
                    return web.Response(
                        status=resp.status,
                        body=body_preview,
                        content_type='text/plain',
                    )

                # Build response headers
                resp_headers = {
                    'Content-Type': mime_type,
                    'Accept-Ranges': 'bytes',
                }

                # Pass through Content-Range (needed for proper seeking)
                if 'Content-Range' in resp.headers:
                    resp_headers['Content-Range'] = resp.headers['Content-Range']

                # Pass through Content-Length
                if 'Content-Length' in resp.headers:
                    resp_headers['Content-Length'] = resp.headers['Content-Length']

                # Use streaming response for large media files
                response = web.StreamResponse(
                    status=resp.status,
                    headers=resp_headers,
                )
                await response.prepare(request)

                async for chunk in resp.content.iter_chunked(65536):
                    await response.write(chunk)

                return response
    except asyncio.CancelledError:
        # Client disconnected — this is normal during seeking
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        _log("Proxy", "ERROR — id=%s\n%s", media_id, tb)
        error_msg = f'Proxy failed: {type(e).__name__}'
        return web.json_response({'error': error_msg}, status=502)


# ── health checker ────────────────────────────────────────────────

async def _check_url(url):
    """HEAD request to check if a URL is still accessible."""
    try:
        timeout = aiohttp.ClientTimeout(total=HEALTH_CHECK_TIMEOUT_S)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.head(url, allow_redirects=True) as resp:
                return 200 <= resp.status < 400
    except Exception:
        return False


async def _health_check_all():
    global _health_running

    if _health_running:
        return
    _health_running = True

    try:
        playlist = cast_service.get_playlist()
        if not playlist:
            _fail_counts.clear()
            return

        active_urls = {item['url'] for item in playlist}
        dead_keys = [u for u in _fail_counts if u not in active_urls]
        for u in dead_keys:
            del _fail_counts[u]

        total = len(playlist)
        logger.info("[HealthChecker] checking %d URLs (concurrency=%d)",
                    total, HEALTH_CHECK_MAX_CONCURRENT)

        # Check in batches
        for i in range(0, total, HEALTH_CHECK_MAX_CONCURRENT):
            batch = playlist[i:i + HEALTH_CHECK_MAX_CONCURRENT]
            tasks = [_check_url(item['url']) for item in batch]
            results = await asyncio.gather(*tasks)

            for j, alive in enumerate(results):
                url = playlist[i + j]['url']
                if alive:
                    _fail_counts.pop(url, None)
                else:
                    fails = _fail_counts.get(url, 0) + 1
                    _fail_counts[url] = fails
                    short = url[:80] + '...' if len(url) > 80 else url
                    logger.info("[HealthChecker] FAIL #%d/%d — %s",
                                fails, HEALTH_CHECK_MAX_FAILS, short)

        dead_urls = {url for url, fails in _fail_counts.items()
                     if fails >= HEALTH_CHECK_MAX_FAILS}

        if dead_urls:
            removed = cast_service.remove_dead_urls(dead_urls)
            for url in dead_urls:
                _fail_counts.pop(url, None)
            logger.info("[HealthChecker] purged %d dead URL(s)", removed)
            _broadcast_playlist()
    except Exception as e:
        logger.error("[HealthChecker] error: %s", e)
    finally:
        _health_running = False


async def _health_checker_loop():
    """Background task: periodically check playlist URLs."""
    # Run immediately on start
    await _health_check_all()

    while True:
        await asyncio.sleep(HEALTH_CHECK_INTERVAL_S)
        await _health_check_all()


# ── heartbeat timeout checker ─────────────────────────────────────

async def _heartbeat_checker_loop():
    """Background task: periodically check for timed-out sessions."""
    scan_interval = HEARTBEAT_SCAN_INTERVAL_MS / 1000
    while True:
        await asyncio.sleep(scan_interval)
        timed_out = _check_timeouts()
        if timed_out:
            logger.info("[WS] timed out %d session(s)", len(timed_out))
            _broadcast_user_status()


# ── static file + SPA fallback (with WebSocket upgrade) ──────────────

def _create_root_handler(static_dir):
    """Return a handler that upgrades to WebSocket or serves static/SPA.

    The browser client connects to ws://host/ (no path). The Node.js ws library
    handled this at the HTTP-server level before routing. In aiohttp we must
    handle it as a route, checking for the Upgrade header.
    """

    async def handler(request):
        # WebSocket upgrade: ws://host/ or ws://host/any/path
        if request.headers.get('Upgrade', '').lower() == 'websocket':
            return await _handle_ws(request)

        # Regular HTTP GET — serve static files or SPA fallback
        req_path = request.path.lstrip('/')
        if not req_path:
            req_path = 'index.html'

        filepath = os.path.join(static_dir, req_path)
        real_static = os.path.realpath(static_dir)
        real_file = os.path.realpath(filepath)
        if not real_file.startswith(real_static + os.sep) and real_file != real_static:
            return web.Response(status=403, text='Forbidden')

        if os.path.isfile(filepath):
            return web.FileResponse(filepath)

        return web.FileResponse(os.path.join(static_dir, 'index.html'))

    return handler


# ── not found handler ─────────────────────────────────────────────

async def _handle_404(request):
    """JSON 404 for API routes, empty 404 for everything else."""
    if request.path.startswith('/api/'):
        return web.json_response({'error': 'Not found'}, status=404)
    return web.Response(status=404)


# ── server lifecycle ──────────────────────────────────────────────

def create_app(static_dir):
    """Create and configure the aiohttp Application."""
    app = web.Application()

    # API routes
    app.router.add_post('/api/cast', handle_cast_post)
    app.router.add_get('/api/cast', handle_cast_get)
    app.router.add_delete('/api/cast/{index}', handle_cast_delete)
    app.router.add_post('/api/cast/reorder', handle_cast_reorder)
    app.router.add_get('/api/users', handle_users)
    app.router.add_get('/api/status', handle_status)

    # Media proxy route (serves extensionless CDN URLs with proper Content-Type)
    app.router.add_get('/proxy/{media_id}', handle_proxy)

    # Root handler: WebSocket upgrade for ws://host/ (browser clients connect
    # at root with no path), or static files + SPA fallback for HTTP GET.
    # Must be registered AFTER API routes and BEFORE the catch-all.
    root_handler = _create_root_handler(static_dir)
    app.router.add_get('/', root_handler)
    app.router.add_get('/{tail:.*}', root_handler)

    # Startup / shutdown hooks
    app.on_startup.append(_on_startup)
    app.on_shutdown.append(_on_shutdown)
    app.on_cleanup.append(_on_cleanup)

    return app


async def _on_startup(app):
    logger.info("[Server] startup — launching background tasks")
    _bg_tasks.add(asyncio.create_task(_heartbeat_checker_loop()))
    _bg_tasks.add(asyncio.create_task(_health_checker_loop()))


async def _on_shutdown(app):
    logger.info("[Server] shutdown — cancelling %d background tasks", len(_bg_tasks))
    for task in _bg_tasks:
        task.cancel()
    await asyncio.gather(*_bg_tasks, return_exceptions=True)
    _bg_tasks.clear()

    logger.info("[Server] shutdown — closing %d WebSocket sessions", len(_sessions))
    for session in list(_sessions.values()):
        try:
            await session['ws'].close(code=1001, message=b'Server shutting down')
        except Exception:
            pass
    _sessions.clear()


async def _on_cleanup(app):
    logger.info("[Server] cleanup complete")


# ── public API (called from renderer plugin) ──────────────────────

async def _start_server(static_dir):
    global _start_time, _runner, _stop_event
    _start_time = time.time()
    _stop_event = asyncio.Event()

    app = create_app(static_dir)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, HOST, PORT)
    await site.start()
    _runner = runner

    logger.info("[Server] listening at http://%s:%d", HOST, PORT)
    logger.info("[Server] static files: %s", static_dir)

    # Wait until stop_event is set
    try:
        await _stop_event.wait()
    except asyncio.CancelledError:
        pass

    logger.info("[Server] stopping...")
    await runner.cleanup()
    _runner = None


def run_server(static_dir):
    """Blocking call — run the aiohttp server. Called from a daemon thread."""
    global _loop, _runner
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    _loop = loop

    try:
        loop.run_until_complete(_start_server(static_dir))
    except KeyboardInterrupt:
        pass
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error("[Server] fatal error: %s", e)
    finally:
        if _runner is not None:
            try:
                loop.run_until_complete(_runner.cleanup())
            except Exception as e:
                logger.error("[Server] cleanup error: %s", e)
            _runner = None
        logger.info("[Server] event loop closed")
        loop.close()
        _loop = None


def stop_server():
    """Signal the server to stop gracefully. Thread-safe."""
    global _loop, _stop_event
    if _loop is not None and _stop_event is not None:
        _loop.call_soon_threadsafe(_stop_event.set)
