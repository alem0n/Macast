import aiohttp
import random
import string
import time
from datetime import datetime, timezone
from urllib.parse import urlparse, unquote

_playlist = []


def _generate_id():
    ts = _base36(int(time.time() * 1000))
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
    return f'{ts}_{rand}'


def _base36(n):
    if n == 0:
        return '0'
    chars = '0123456789abcdefghijklmnopqrstuvwxyz'
    result = []
    while n > 0:
        result.append(chars[n % 36])
        n //= 36
    return ''.join(reversed(result))


def validate_url(url):
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return {'valid': False}

        pathname = parsed.path.lower()
        fmt = 'unknown'

        if pathname.endswith('.mp4'):
            fmt = 'mp4'
        elif pathname.endswith('.webm'):
            fmt = 'webm'
        elif pathname.endswith('.m3u8') or 'm3u8' in pathname:
            fmt = 'hls'
        elif pathname.endswith('.mpd'):
            fmt = 'dash'

        return {'valid': True, 'format': fmt}
    except Exception:
        return {'valid': False}


async def probe_content_type(url):
    """Send a HEAD request to probe the actual Content-Type of a URL.

    Used for extensionless URLs (e.g. Douyin CDN) where the format
    cannot be determined from the pathname alone.

    Returns the MIME type string (e.g. 'video/mp4') or None.
    """
    try:
        timeout = aiohttp.ClientTimeout(total=5)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.head(url, allow_redirects=True) as resp:
                ct = resp.headers.get('Content-Type', '')
                ct = ct.split(';')[0].strip().lower()
                if ct and ct.startswith('video/'):
                    return ct
                return None
    except Exception:
        return None


def extract_title(url):
    try:
        parsed = urlparse(url)
        filename = parsed.path.rsplit('/', 1)[-1]
        return unquote(filename) or '未命名视频'
    except Exception:
        return '未命名视频'


def add_to_playlist(body, mime_type=None):
    validation = validate_url(body['url'])
    fmt = validation.get('format', 'unknown')
    is_extensionless = (fmt == 'unknown')  # Save before mime_type override
    title = body.get('title') or extract_title(body['url'])
    mid = _generate_id()

    # If HEAD probe determined the actual format, override extension-based guess
    if mime_type:
        if 'mp4' in mime_type:
            fmt = 'mp4'
        elif 'webm' in mime_type:
            fmt = 'webm'

    media = {
        'id': mid,
        'url': body['url'],
        'title': title,
        'duration': body.get('duration', 0),
        'format': fmt,
        'castAt': datetime.now(timezone.utc).isoformat(),
        'source': body.get('source', 'dlna'),
    }

    # Only include mimeType when we have a useful value from probing
    if mime_type:
        media['mimeType'] = mime_type

    # Always proxy extensionless URLs — the <video> element cannot
    # play them directly (no file extension → no MIME hint for browser).
    # The proxy handler forwards Range requests with browser-like
    # headers and sets Content-Type explicitly.
    if is_extensionless:
        media['proxyUrl'] = f'/proxy/{mid}'

    _playlist.append(media)
    return media


def find_by_id(media_id):
    """Look up a media item by its id. Returns the dict or None."""
    for item in _playlist:
        if item['id'] == media_id:
            return item
    return None


def get_last_item():
    """Return the most recently added playlist item, or None if empty."""
    return _playlist[-1] if _playlist else None


def update_item(media_id, **fields):
    """Update fields on a playlist item by id. Returns the item or None."""
    item = find_by_id(media_id)
    if not item:
        return None
    item.update(fields)
    return item


def update_last_item(**fields):
    """Update fields on the most recently added item. Returns the item or None."""
    item = get_last_item()
    if not item:
        return None
    item.update(fields)
    return item


def get_playlist():
    return list(_playlist)


def remove_item(index):
    if index < 0 or index >= len(_playlist):
        return None
    return _playlist.pop(index)


def reorder(from_index, to_index):
    if from_index < 0 or from_index >= len(_playlist):
        return False
    if to_index < 0 or to_index >= len(_playlist):
        return False
    item = _playlist.pop(from_index)
    _playlist.insert(to_index, item)
    return True


def remove_dead_urls(dead_urls):
    global _playlist
    before = len(_playlist)
    _playlist = [item for item in _playlist if item['url'] not in dead_urls]
    return before - len(_playlist)


def clear_playlist():
    global _playlist
    _playlist = []
