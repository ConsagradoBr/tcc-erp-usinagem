# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path

project_dir = Path.cwd()

datas = [(str(project_dir / 'dist'), 'dist')]
icon_file = project_dir / 'src' / 'assets' / 'amp-icon.ico'
if icon_file.exists():
    datas.append((str(icon_file), 'src/assets'))

a = Analysis(
    ['desktop_app.py'],
    pathex=[str(project_dir)],
    binaries=[],
    datas=datas,
    hiddenimports=[
        'waitress',
        'win32gui',
        'win32con',
        'pywintypes',
        'PySide6.QtCore',
        'PySide6.QtGui',
        'PySide6.QtWidgets',
        'PySide6.QtWebChannel',
        'PySide6.QtWebEngineCore',
        'PySide6.QtWebEngineWidgets',
    ],
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
