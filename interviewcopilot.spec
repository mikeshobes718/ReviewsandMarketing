# PyInstaller spec for InterviewCopilot (macOS .app)
from PyInstaller.utils.hooks import collect_submodules
import os

block_cipher = None

project_root = os.path.abspath(os.getcwd())

hiddenimports = []
hiddenimports += collect_submodules('PIL')
hiddenimports += collect_submodules('pystray')
hiddenimports += collect_submodules('dotenv')
hiddenimports += [
    'numpy',
    'sounddevice',
    'soundfile',
    'openai',
]

a = Analysis(
    ['main.py'],
    pathex=[project_root, os.path.join(project_root, 'src')],
    binaries=[],
    datas=[('.env.example', '.'), (os.path.join('assets','icon.icns'), 'assets')],
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='InterviewCopilot',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # windowed app
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='InterviewCopilot',
)

app = BUNDLE(
    coll,
    name='InterviewCopilot.app',
    icon=os.path.join(project_root, 'assets', 'icon.icns'),
    bundle_identifier='com.interview.copilot',
    info_plist={
        'NSHighResolutionCapable': True,
        'NSMicrophoneUsageDescription': 'InterviewCopilot needs microphone access to record audio clips you intentionally capture.',
        # Allow network requests to OpenAI endpoints
        'NSAppTransportSecurity': {
            'NSAllowsArbitraryLoads': True
        },
        # Prevent App Nap for better background hotkeys/recording
        'NSAppSleepDisabled': True,
        'LSApplicationCategoryType': 'public.app-category.productivity',
    },
)
