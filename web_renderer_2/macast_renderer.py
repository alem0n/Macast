# <macast.renderer>WebRenderer2</macast.renderer>
# <macast.title>Web Renderer 2</macast.title>
# <macast.platform>win32,linux,darwin</macast.platform>
# <macast.version>2.0.0</macast.version>
# <macast.author>Macast</macast.author>
# <macast.desc>Browser-based cast receiver — DLNA投屏转Web播放，多用户同时观看。内置Python服务端，无需Node.js。</macast.desc>

import os
import sys
import time
import shutil
import logging
import threading
import requests
import webbrowser

from macast.renderer import Renderer

logger = logging.getLogger("WebRenderer2")
logger.setLevel(logging.INFO)

WEB_RENDERER_URL = "http://127.0.0.1:2554/api/cast"
SERVER_PORT = 2554

SETTING_DIR = os.path.dirname(os.path.dirname(__file__))
APP_DIR = os.path.join(SETTING_DIR, 'web_renderer_2_app')

# Bundled app directory (only set when running from PyInstaller exe)
BUNDLED_APP_DIR = None
if getattr(sys, 'frozen', False):
    _meipass = getattr(sys, '_MEIPASS', None)
    if _meipass:
        _bundled = os.path.join(_meipass, 'web_renderer_2_app')
        if os.path.isdir(_bundled):
            BUNDLED_APP_DIR = _bundled


class WebRenderer2(Renderer):

    def __init__(self, lang=None):
        super().__init__(lang)
        self._title = ""
        self._pending_url = ""
        self._server_thread = None
        self._server_ready = False

    # ── server file resolution ─────────────────────────────────────

    def _resolve_app_dir(self):
        """Return (app_dir, static_dir) for the current run mode.

        Priority: 1) persistent SETTING_DIR  2) bundled MEIPASS dir.
        On first PyInstaller run, extracts the bundled app to SETTING_DIR
        so that future runs don't depend on the MEIPASS temp dir.
        """
        # Already deployed to persistent location?
        server_init = os.path.join(APP_DIR, 'server_py', '__init__.py')
        static_index = os.path.join(APP_DIR, 'client', 'dist', 'index.html')

        if os.path.isfile(server_init) and os.path.isfile(static_index):
            logger.info("Using persistent app dir: %s", APP_DIR)
            return APP_DIR, os.path.join(APP_DIR, 'client', 'dist')

        # Extract from PyInstaller bundle if available
        if BUNDLED_APP_DIR:
            logger.info("Extracting bundled Web Renderer 2 app to %s", APP_DIR)
            try:
                if os.path.isdir(APP_DIR):
                    shutil.rmtree(APP_DIR)
                shutil.copytree(BUNDLED_APP_DIR, APP_DIR)
                logger.info("Extraction complete")
                return APP_DIR, os.path.join(APP_DIR, 'client', 'dist')
            except Exception as e:
                logger.error("Failed to extract bundled app: %s", e)
                # Fall back to in-place serving from MEIPASS
                return BUNDLED_APP_DIR, os.path.join(BUNDLED_APP_DIR, 'client', 'dist')

        logger.error(
            "Web Renderer 2 app files not found. "
            "Run deploy.ps1 first or build with -WithWebRenderer."
        )
        return None, None

    # ── server lifecycle ───────────────────────────────────────────

    def _wait_for_server(self, timeout=10):
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                resp = requests.get(
                    f'http://127.0.0.1:{SERVER_PORT}/api/status',
                    timeout=2)
                if resp.status_code == 200:
                    logger.info("Web Renderer 2 Python server is ready")
                    return True
            except requests.ConnectionError:
                pass
            time.sleep(0.5)
        return False

    def _open_browser(self, url):
        try:
            if sys.platform == 'darwin':
                import subprocess
                subprocess.Popen(['open', url])
            elif sys.platform == 'win32':
                webbrowser.open(url)
            else:
                import subprocess
                subprocess.Popen(["xdg-open", url])
            logger.info("Browser opened: %s", url)
        except Exception as e:
            logger.error("Failed to open browser: %s", e)

    def start(self):
        super().start()

        app_dir, static_dir = self._resolve_app_dir()
        if not app_dir:
            return

        # Ensure server_py package is importable
        if app_dir not in sys.path:
            sys.path.insert(0, app_dir)

        try:
            import server_py.server as server_module
        except ImportError as e:
            logger.error("Failed to import server_py: %s", e)
            return

        self._server_thread = threading.Thread(
            target=server_module.run_server,
            args=(static_dir,),
            daemon=True,
            name="web-renderer-2-server",
        )
        self._server_thread.start()

        if self._wait_for_server(timeout=10):
            logger.info("Web Renderer 2 started successfully")
            self._open_browser(f'http://127.0.0.1:{SERVER_PORT}')
        else:
            logger.error("Web Renderer 2 Python server failed to start in time")

    def stop(self):
        logger.info("Stopping Web Renderer 2 server")
        try:
            import server_py.server as server_module
            server_module.stop_server()
        except ImportError:
            pass

        if self._server_thread and self._server_thread.is_alive():
            self._server_thread.join(timeout=5)
            if self._server_thread.is_alive():
                logger.warning("Server thread did not stop within 5 seconds")
        self._server_thread = None
        super().stop()

    # ── cast forwarding ────────────────────────────────────────────

    def _post_cast(self, url, title=""):
        logger.info(
            "[_post_cast] POST /api/cast url=%s title=%s",
            url, title if title else "<empty>"
        )
        try:
            resp = requests.post(
                WEB_RENDERER_URL,
                json={
                    "url": url,
                    "title": title,
                    "duration": 0,
                    "source": "dlna",
                },
                timeout=5,
            )
            if resp.status_code == 201:
                data = resp.json()
                logger.info(
                    "[_post_cast] OK — server assigned id=%s title=%s format=%s",
                    data.get('media', {}).get('id', '?'),
                    data.get('media', {}).get('title', '?'),
                    data.get('media', {}).get('format', '?'),
                )
            else:
                logger.error("[_post_cast] FAILED status=%s body=%s", resp.status_code, resp.text)
        except requests.exceptions.ConnectionError:
            logger.error("[_post_cast] FAILED — cannot connect to port %s", SERVER_PORT)
        except Exception as e:
            logger.error("[_post_cast] FAILED — %s: %s", type(e).__name__, e)

    # ── Renderer interface ─────────────────────────────────────────

    def set_media_url(self, url, start="0"):
        self._pending_url = url
        logger.info("[set_media_url] URL=%s (deferred, waiting for title)", url)
        if self._title:
            self._post_cast(url, self._title)
            self._title = ""
            self._pending_url = ""

    def set_media_title(self, data):
        logger.info("[set_media_title] title=%s", data)
        self._title = data
        if self._pending_url:
            self._post_cast(self._pending_url, data)
            self._pending_url = ""
            self._title = ""

    def set_media_stop(self):
        pass

    def set_media_pause(self):
        pass

    def set_media_resume(self):
        if self._pending_url:
            logger.info("[set_media_resume] flushing pending url without title")
            self._post_cast(self._pending_url, self._title)
            self._pending_url = ""
            self._title = ""

    def set_media_volume(self, data):
        pass

    def set_media_mute(self, data):
        pass

    def set_media_position(self, data):
        pass

    def set_media_sub_file(self, data):
        pass

    def set_media_sub_show(self, data: bool):
        pass

    def set_media_text(self, data: str, duration: int = 1000):
        pass

    def set_media_speed(self, data: float):
        pass
