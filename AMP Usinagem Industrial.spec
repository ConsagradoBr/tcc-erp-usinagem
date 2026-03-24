# -*- mode: python ; coding: utf-8 -*-

import shutil
from pathlib import Path

project_dir = Path.cwd()
venv_site = project_dir / 'backend' / 'venv' / 'Lib' / 'site-packages'
webview2_dir = venv_site / 'webview2'

# The upstream package ships the window DLL with a different casing than the
# ctypes loader expects. Create an alias so PyInstaller can resolve it cleanly.
expected_window_dll = webview2_dir / 'WebView2Window.dll'
packaged_window_dll = webview2_dir / 'Webview2Window.dll'
if packaged_window_dll.exists() and not expected_window_dll.exists():
    shutil.copy2(packaged_window_dll, expected_window_dll)

binaries = []
for dll_name in ('WebView2Loader.dll', 'WebView2Window.dll'):
    dll_path = webview2_dir / dll_name
    if dll_path.exists():
        binaries.append((str(dll_path), 'webview2'))

datas = [(str(project_dir / 'dist'), 'dist')]
icon_file = project_dir / 'src' / 'assets' / 'amp-icon.ico'
if icon_file.exists():
    datas.append((str(icon_file), 'src/assets'))
if webview2_dir.exists():
    datas.append((str(webview2_dir), 'webview2'))

a = Analysis(
    ['desktop_app.py'],
    pathex=[str(project_dir)],
    binaries=binaries,
    datas=datas,
    hiddenimports=['waitress', 'webview2', 'voxe', 'pythoncom', 'win32gui', 'win32con', 'pywintypes'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='AMP Usinagem Industrial',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='src/assets/amp-icon.ico',
    version='version_info.txt',
)
