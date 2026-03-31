import ctypes
import os
import socket
import sys
import time
import webbrowser
from pathlib import Path
from threading import Thread

from flask import send_from_directory
from waitress import serve

from backend.app import app as flask_app

APP_NAME = "AMP Usinagem Industrial"
HOST = "127.0.0.1"
PORT = int(os.getenv("DESKTOP_PORT", os.getenv("PORT", "5000")))
URL = f"http://{HOST}:{PORT}"
WINDOW_SIZE = os.getenv("DESKTOP_WINDOW_SIZE", "1440x900")
MIN_WINDOW_SIZE = os.getenv("DESKTOP_MIN_WINDOW_SIZE", "1180x760")
MUTEX_NAME = r"Local\AMPUsinagemIndustrialDesktop"
ERROR_ALREADY_EXISTS = 183

if getattr(sys, "frozen", False):
    BASE_PATH = Path(sys._MEIPASS)
else:
    BASE_PATH = Path(__file__).resolve().parent

DIST_PATH = BASE_PATH / "dist"
ICON_PATH = BASE_PATH / "src" / "assets" / "amp-icon.ico"
MUTEX_HANDLE = None
ALLOW_BROWSER_FALLBACK = (
    os.getenv("DESKTOP_ALLOW_BROWSER_FALLBACK", "").strip().lower() == "true"
)


def parse_size(value, fallback):
    try:
        width, height = value.lower().split("x", 1)
        return max(int(width), 640), max(int(height), 480)
    except Exception:
        return fallback


def acquire_single_instance():
    global MUTEX_HANDLE

    if os.name != "nt":
        return True

    kernel32 = ctypes.windll.kernel32
    handle = kernel32.CreateMutexW(None, False, MUTEX_NAME)
    if not handle:
        return False

    MUTEX_HANDLE = handle
    if kernel32.GetLastError() == ERROR_ALREADY_EXISTS:
        return False
    return True


def release_single_instance():
    global MUTEX_HANDLE

    if os.name != "nt" or not MUTEX_HANDLE:
        return

    kernel32 = ctypes.windll.kernel32
    kernel32.ReleaseMutex(MUTEX_HANDLE)
    kernel32.CloseHandle(MUTEX_HANDLE)
    MUTEX_HANDLE = None


def runtime_data_dir() -> Path:
    root = Path(os.getenv("LOCALAPPDATA") or Path.home()) / APP_NAME
    root.mkdir(parents=True, exist_ok=True)
    return root


@flask_app.route("/", defaults={"path": ""})
@flask_app.route("/<path:path>")
def serve_spa(path):
    target = DIST_PATH / path
    if path and target.exists() and target.is_file():
        return send_from_directory(DIST_PATH, path)
    return send_from_directory(DIST_PATH, "index.html")


def run_server():
    print(f"Iniciando servidor local em {URL}...")
    serve(flask_app, host=HOST, port=PORT, threads=8)


def wait_for_server(timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((HOST, PORT), timeout=1):
                return True
        except OSError:
            time.sleep(0.25)
    return False


def is_existing_instance_active():
    try:
        with socket.create_connection((HOST, PORT), timeout=1):
            return True
    except OSError:
        return False


def focus_existing_instance():
    if os.name != "nt":
        return False

    try:
        import win32con
        import win32gui

        hwnd = win32gui.FindWindow(None, APP_NAME)
        if not hwnd:
            return False

        if win32gui.IsIconic(hwnd):
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        else:
            win32gui.ShowWindow(hwnd, win32con.SW_SHOW)

        try:
            ctypes.windll.user32.SetForegroundWindow(hwnd)
        except Exception:
            pass

        return True
    except Exception as exc:
        print(f"Falha ao focar a janela existente: {exc}")
        return False


def open_native_window():
    try:
        from PySide6.QtCore import QStandardPaths, Qt, QUrl
        from PySide6.QtGui import QGuiApplication, QIcon
        from PySide6.QtWebEngineCore import (QWebEnginePage, QWebEngineProfile,
                                             QWebEngineSettings)
        from PySide6.QtWebEngineWidgets import QWebEngineView
        from PySide6.QtWidgets import QApplication, QMainWindow
    except Exception as exc:
        print(f"Host Qt indisponivel: {exc}")
        return False

    width, height = parse_size(WINDOW_SIZE, (1440, 900))
    min_width, min_height = parse_size(MIN_WINDOW_SIZE, (1180, 760))
    data_dir = runtime_data_dir()
    profile_dir = data_dir / "qtwebengine"
    profile_dir.mkdir(parents=True, exist_ok=True)

    class AmpPage(QWebEnginePage):
        def __init__(self, profile, parent=None):
            super().__init__(profile, parent)
            self.new_page = None

        def createWindow(self, _window_type):
            self.new_page = QWebEnginePage(self.profile(), self)
            self.new_page.urlChanged.connect(self._handle_new_window_url)
            return self.new_page

        def _handle_new_window_url(self, url):
            if url.isValid() and url.scheme().startswith("http"):
                webbrowser.open_new(url.toString())
            if self.new_page is not None:
                self.new_page.deleteLater()
                self.new_page = None

    class AmpWindow(QMainWindow):
        def __init__(self):
            super().__init__()
            self.setWindowTitle(APP_NAME)
            if ICON_PATH.exists():
                self.setWindowIcon(QIcon(str(ICON_PATH)))
            self.resize(width, height)
            self.setMinimumSize(min_width, min_height)

            self.webview = QWebEngineView(self)
            self.profile = QWebEngineProfile(APP_NAME, self.webview)
            self.profile.setCachePath(str(profile_dir / "cache"))
            self.profile.setPersistentStoragePath(str(profile_dir / "storage"))
            self.profile.settings().setAttribute(
                QWebEngineSettings.LocalContentCanAccessRemoteUrls, True
            )
            self.profile.settings().setAttribute(
                QWebEngineSettings.FullScreenSupportEnabled, False
            )

            page = AmpPage(self.profile, self.webview)
            page.windowCloseRequested.connect(self.close)
            page.loadFinished.connect(lambda _ok: self.setWindowTitle(APP_NAME))
            self.webview.setPage(page)
            self.webview.setContextMenuPolicy(Qt.NoContextMenu)

            self.setCentralWidget(self.webview)
            self._center_on_screen()
            self.webview.load(QUrl(URL))

        def _center_on_screen(self):
            screen = self.screen() or QGuiApplication.primaryScreen()
            if not screen:
                return
            available = screen.availableGeometry()
            frame = self.frameGeometry()
            frame.moveCenter(available.center())
            self.move(frame.topLeft())

        def closeEvent(self, event):
            self.profile.deleteLater()
            super().closeEvent(event)

    try:
        print("Abrindo janela nativa com PySide6...")
        app = QApplication.instance() or QApplication(sys.argv)
        app.setApplicationName(APP_NAME)
        app.setOrganizationName("AMP Usinagem Industrial")
        if ICON_PATH.exists():
            app.setWindowIcon(QIcon(str(ICON_PATH)))

        storage_path = QStandardPaths.writableLocation(QStandardPaths.AppDataLocation)
        if storage_path:
            Path(storage_path).mkdir(parents=True, exist_ok=True)

        window = AmpWindow()
        window.show()
        return app.exec() == 0
    except Exception as exc:
        print(f"Falha ao abrir janela nativa Qt: {exc}")
        return False


def open_browser_fallback():
    try:
        if os.name == "nt":
            os.startfile(URL)
        else:
            webbrowser.open_new(URL)
        print("Fallback para navegador padrao executado.")
        return True
    except Exception as exc:
        print(f"Falha no fallback do navegador: {exc}")
        return False


if __name__ == "__main__":
    if is_existing_instance_active():
        print(f"{APP_NAME} ja esta em execucao.")
        focus_existing_instance()
        sys.exit(0)

    if not acquire_single_instance():
        print(f"{APP_NAME} ja esta em execucao.")
        focus_existing_instance()
        sys.exit(0)

    print(f"Inicializando {APP_NAME}...")
    Thread(target=run_server, daemon=True).start()

    try:
        if not wait_for_server():
            print("Nao foi possivel iniciar o servidor local do aplicativo.")
            sys.exit(1)

        if open_native_window():
            sys.exit(0)

        if ALLOW_BROWSER_FALLBACK:
            if not open_browser_fallback():
                print(f"Abra manualmente: {URL}")
        else:
            print(
                "Falha ao abrir a janela nativa. "
                "O app foi configurado para nao cair automaticamente no navegador. "
                "Se precisar liberar esse comportamento, defina "
                "DESKTOP_ALLOW_BROWSER_FALLBACK=true."
            )
            sys.exit(1)
    except KeyboardInterrupt:
        print(f"Encerrando {APP_NAME}...")
        sys.exit(0)
    finally:
        release_single_instance()
