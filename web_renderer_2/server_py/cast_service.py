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


def extract_title(url):
    try:
        parsed = urlparse(url)
        filename = parsed.path.rsplit('/', 1)[-1]
        return unquote(filename) or '未命名视频'
    except Exception:
        return '未命名视频'


def add_to_playlist(body):
    validation = validate_url(body['url'])
    fmt = validation.get('format', 'unknown')
    title = body.get('title') or extract_title(body['url'])
    mid = _generate_id()

    media = {
        'id': mid,
        'url': body['url'],
        'title': title,
        'duration': body.get('duration', 0),
        'format': fmt,
        'castAt': datetime.now(timezone.utc).isoformat(),
        'source': body.get('source', 'dlna'),
    }

    _playlist.append(media)
    return media


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
