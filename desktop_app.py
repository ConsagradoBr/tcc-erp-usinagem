import asyncio
import contextlib
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


def get_screen_size():
    if os.name != "nt":
        return 1920, 1080
    user32 = ctypes.windll.user32
    try:
        user32.SetProcessDPIAware()
    except Exception:
        pass
    return user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)


def centered_position(width, height):
    screen_width, screen_height = get_screen_size()
    return max((screen_width - width) // 2, 0), max((screen_height - height) // 2, 0)


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


async def keep_window_stable(min_width, min_height, initial_x, initial_y):
    import win32gui
    from webview2.base import get_window, set_position, set_size

    positioned = False

    while True:
        hwnd = get_window()
        if hwnd:
            if not positioned:
                set_position(initial_x, initial_y)
                positioned = True

            left, top, right, bottom = win32gui.GetWindowRect(hwnd)
            width = max(right - left, 0)
            height = max(bottom - top, 0)

            if width < min_width or height < min_height:
                set_size(max(width, min_width), max(height, min_height))

            if left < 0 or top < 0:
                set_position(max(left, 0), max(top, 0))

        await asyncio.sleep(0.2)


def open_native_window():
    try:
        from webview2 import Window
    except Exception as exc:
        print(f"WebView2 nativo indisponivel: {exc}")
        return False

    cache_dir = runtime_data_dir() / "webview2-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    width, height = parse_size(WINDOW_SIZE, (1440, 900))
    min_width, min_height = parse_size(MIN_WINDOW_SIZE, (1180, 760))
    x, y = centered_position(width, height)
    icon = str(ICON_PATH) if ICON_PATH.exists() else None

    async def run_window():
        window = Window(
            title=APP_NAME,
            icon=icon,
            url=URL,
            size=f"{width}x{height}",
            cache=str(cache_dir),
        )
        monitor = asyncio.create_task(keep_window_stable(min_width, min_height, x, y))
        try:
            await window.run()
        finally:
            monitor.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await monitor

    try:
        print("Abrindo janela nativa com WebView2...")
        asyncio.run(run_window())
        return True
    except Exception as exc:
        print(f"Falha ao abrir janela nativa: {exc}")
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
        sys.exit(0)

    if not acquire_single_instance():
        print(f"{APP_NAME} ja esta em execucao.")
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

        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"Encerrando {APP_NAME}...")
        sys.exit(0)
    finally:
        release_single_instance()
