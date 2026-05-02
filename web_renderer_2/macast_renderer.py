# <macast.renderer>WebRenderer2</macast.renderer>
# <macast.title>Web Renderer 2</macast.title>
# <macast.platform>win32,linux,darwin</macast.platform>
# <macast.version>1.0.0</macast.version>
# <macast.author>Macast</macast.author>
# <macast.desc>Browser-based cast receiver — DLNA投屏转Web播放，多用户同时观看。选中后自动启动内置Node.js服务。</macast.desc>

import os
import sys
import time
import shutil
import logging
import requests
import webbrowser
import subprocess

from macast.renderer import Renderer

logger = logging.getLogger("WebRenderer2")
logger.setLevel(logging.INFO)

WEB_RENDERER_URL = "http://127.0.0.1:2554/api/cast"
SERVER_PORT = 2554

# Prevent console windows from appearing on Windows
_CREATION_FLAGS = 0
if sys.platform == 'win32':
    _CREATION_FLAGS = subprocess.CREATE_NO_WINDOW  # 0x08000000, since Python 3.7

# Persistent app directory: {SETTING_DIR}/web_renderer_2_app/server/
# SETTING_DIR = os.path.dirname(os.path.dirname(__file__)) which is the
# Macast config dir (e.g. %LOCALAPPDATA%/xfangfang/Macast on Windows).
SETTING_DIR = os.path.dirname(os.path.dirname(__file__))
APP_DIR = os.path.join(SETTING_DIR, 'web_renderer_2_app')
SERVER_DIR = os.path.join(APP_DIR, 'server')

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
        self._proc = None

    # ── prerequisites ──────────────────────────────────────────────

    def _check_node(self):
        try:
            subprocess.run(['node', '--version'],
                         capture_output=True, timeout=5,
                         creationflags=_CREATION_FLAGS)
            return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def _check_server_dir(self):
        entry = os.path.join(SERVER_DIR, 'dist', 'index.js')
        return os.path.isfile(entry)

    def _extract_bundled_app(self):
        """Copy bundled web_renderer_2_app from PyInstaller temp dir to SETTING_DIR."""
        if not BUNDLED_APP_DIR:
            return False

        logger.info("Extracting bundled Web Renderer 2 app to %s", APP_DIR)
        try:
            if os.path.isdir(APP_DIR):
                shutil.rmtree(APP_DIR)
            shutil.copytree(BUNDLED_APP_DIR, APP_DIR)
            logger.info("Extraction complete")
            return True
        except Exception as e:
            logger.error("Failed to extract bundled app: %s", e)
            return False

    def _ensure_deps(self):
        """Install server production dependencies if node_modules is missing."""
        node_modules = os.path.join(SERVER_DIR, 'node_modules')
        if os.path.isdir(node_modules):
            return True

        package_json = os.path.join(SERVER_DIR, 'package.json')
        if not os.path.isfile(package_json):
            logger.error("package.json not found at %s", package_json)
            return False

        logger.info("Installing server production dependencies...")
        try:
            subprocess.run(
                ['npm', 'install', '--omit=dev'],
                cwd=SERVER_DIR,
                capture_output=True,
                timeout=120,
                creationflags=_CREATION_FLAGS,
            )
            logger.info("Dependencies installed")
            return True
        except Exception as e:
            logger.error("Failed to install dependencies: %s", e)
            return False

    # ── server lifecycle ───────────────────────────────────────────

    def _wait_for_server(self, timeout=10):
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                resp = requests.get(
                    f'http://127.0.0.1:{SERVER_PORT}/api/status',
                    timeout=2)
                if resp.status_code == 200:
                    logger.info("Web Renderer 2 server is ready")
                    return True
            except requests.ConnectionError:
                pass
            time.sleep(0.5)
        return False

    def _open_browser(self, url):
        """Open browser using platform-specific method, same as App.open_browser()."""
        try:
            if sys.platform == 'darwin':
                subprocess.Popen(['open', url], creationflags=_CREATION_FLAGS)
            elif sys.platform == 'win32':
                webbrowser.open(url)
            else:
                subprocess.Popen(["xdg-open", url], creationflags=_CREATION_FLAGS)
            logger.info(f"Browser opened: {url}")
        except Exception as e:
            logger.error(f"Failed to open browser: {e}")

    def start(self):
        super().start()

        if not self._check_node():
            logger.error("Node.js not found. Web Renderer 2 requires Node.js >= 18.")
            return

        # Ensure server files exist in persistent location.
        # Priority: 1) already deployed  2) extract from PyInstaller bundle
        if not self._check_server_dir():
            if BUNDLED_APP_DIR:
                if not self._extract_bundled_app():
                    return
            else:
                logger.error(
                    "Server files not found at %s/dist/ and no bundled app available. "
                    "Run deploy.ps1 first or build with -WithWebRenderer.",
                    SERVER_DIR
                )
                return

        if not self._ensure_deps():
            return

        try:
            self._proc = subprocess.Popen(
                ['node', 'dist/index.js'],
                cwd=SERVER_DIR,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=_CREATION_FLAGS,
            )
            logger.info(f"Web Renderer 2 server starting (pid={self._proc.pid})")

            if self._wait_for_server(timeout=10):
                logger.info("Web Renderer 2 started successfully")
                self._open_browser(f'http://127.0.0.1:{SERVER_PORT}')
            else:
                logger.error("Web Renderer 2 server failed to start in time")
        except Exception as e:
            logger.error(f"Failed to start Web Renderer 2 server: {e}")
            self._proc = None

    def stop(self):
        logger.info("Stopping Web Renderer 2 server")
        if self._proc:
            try:
                if sys.platform == 'win32':
                    subprocess.run(['taskkill', '/f', '/t', '/pid', str(self._proc.pid)],
                                 capture_output=True, timeout=5,
                                 creationflags=_CREATION_FLAGS)
                else:
                    self._proc.terminate()
                    try:
                        self._proc.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        self._proc.kill()
                        self._proc.wait(timeout=3)
            except Exception as e:
                logger.error(f"Error stopping server: {e}")
            finally:
                self._proc = None
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
