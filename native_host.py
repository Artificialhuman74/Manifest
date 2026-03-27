#!/usr/bin/python3
"""
Chrome Native Messaging host for PESU Slide Downloader.
Receives a PPTX file in base64 chunks, converts it to PDF using LibreOffice,
and streams the PDF back in base64 chunks.

Protocol (persistent port via chrome.runtime.connectNative):
  Extension → host: { "action": "chunk", "data": "<b64>", "index": N }  (one per chunk)
  Extension → host: { "action": "done" }
  Host → extension: { "status": "chunk", "data": "<b64>", "index": N, "total": T }
  Host → extension: { "status": "done" }
            OR      { "status": "error", "error": "..." }
"""
import sys
import os
import json
import struct
import base64
import subprocess
import tempfile
import shutil
from pathlib import Path

LIBRE_PATHS = [
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',   # macOS
    '/usr/local/bin/soffice',                                  # Linux
    '/usr/bin/soffice',                                        # Linux
    r'C:\Program Files\LibreOffice\program\soffice.exe',       # Windows default
    r'C:\Program Files (x86)\LibreOffice\program\soffice.exe', # Windows 32-bit
]
CHUNK_SIZE = 700_000  # chars of base64 per outgoing message (~525 KB decoded)


def read_msg():
    raw = sys.stdin.buffer.read(4)
    if len(raw) < 4:
        return None
    length = struct.unpack('<I', raw)[0]
    data = sys.stdin.buffer.read(length)
    return json.loads(data.decode('utf-8'))


def send_msg(obj):
    data = json.dumps(obj).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('<I', len(data)))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


def find_libreoffice():
    for p in LIBRE_PATHS:
        if os.path.exists(p):
            return p
    return None


def main():
    libre = find_libreoffice()
    if not libre:
        send_msg({'status': 'error', 'error': 'LibreOffice not found. Install from https://www.libreoffice.org'})
        return

    # Accumulate incoming PPTX base64 chunks
    pptx_parts = []
    while True:
        msg = read_msg()
        if msg is None:
            return  # stdin closed
        action = msg.get('action')
        if action == 'chunk':
            pptx_parts.append(msg['data'])
        elif action == 'done':
            break
        else:
            send_msg({'status': 'error', 'error': f'Unknown action: {action}'})
            return

    # Decode PPTX bytes
    try:
        pptx_bytes = base64.b64decode(''.join(pptx_parts))
    except Exception as e:
        send_msg({'status': 'error', 'error': f'base64 decode failed: {e}'})
        return

    tmpdir = tempfile.mkdtemp(prefix='pesu_convert_')
    try:
        pptx_path = os.path.join(tmpdir, 'input.pptx')
        with open(pptx_path, 'wb') as f:
            f.write(pptx_bytes)

        result = subprocess.run(
            [libre, '--headless', '--convert-to', 'pdf', '--outdir', tmpdir, pptx_path],
            capture_output=True,
            timeout=120
        )
        if result.returncode != 0:
            err = result.stderr.decode('utf-8', errors='replace')[:300]
            send_msg({'status': 'error', 'error': f'LibreOffice failed: {err}'})
            return

        pdf_path = os.path.join(tmpdir, 'input.pdf')
        if not os.path.exists(pdf_path):
            send_msg({'status': 'error', 'error': 'LibreOffice produced no output PDF'})
            return

        pdf_bytes = Path(pdf_path).read_bytes()
        pdf_b64 = base64.b64encode(pdf_bytes).decode('ascii')

        # Stream PDF back in chunks
        total = max(1, -(-len(pdf_b64) // CHUNK_SIZE))  # ceiling division
        for i in range(total):
            chunk = pdf_b64[i * CHUNK_SIZE:(i + 1) * CHUNK_SIZE]
            send_msg({'status': 'chunk', 'data': chunk, 'index': i, 'total': total})
        send_msg({'status': 'done'})

    except subprocess.TimeoutExpired:
        send_msg({'status': 'error', 'error': 'LibreOffice conversion timed out (120s)'})
    except Exception as e:
        send_msg({'status': 'error', 'error': str(e)})
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def install_windows():
    """Register the native messaging host on Windows via the registry."""
    import winreg

    script_dir = Path(__file__).resolve().parent
    manifest_path = script_dir / 'com.pesu.downloader.json'
    bat_path      = script_dir / 'native_host.bat'

    ext_id = input('Open chrome://extensions, find Manifest, copy its ID, paste here: ').strip()
    if not ext_id:
        print('No extension ID entered — aborting.')
        return

    # Chrome on Windows cannot execute .py files directly — it needs an executable.
    # Write a .bat wrapper that invokes Python with this script.
    bat_path.write_text(
        f'@echo off\r\npython "{script_dir / "native_host.py"}"\r\n',
        encoding='utf-8'
    )
    print(f'Wrapper created: {bat_path}')

    manifest = {
        'name': 'com.pesu.downloader',
        'description': 'PESU PPT converter',
        'path': str(bat_path),   # must point to an executable, not a .py file
        'type': 'stdio',
        'allowed_origins': [f'chrome-extension://{ext_id}/']
    }
    manifest_path.write_text(json.dumps(manifest, indent=2))

    reg_key = r'Software\Google\Chrome\NativeMessagingHosts\com.pesu.downloader'
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, reg_key) as key:
        winreg.SetValueEx(key, '', 0, winreg.REG_SZ, str(manifest_path))

    print(f'Manifest written: {manifest_path}')
    print('Reload the extension in chrome://extensions.')


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--install':
        if sys.platform == 'win32':
            install_windows()
        else:
            print('--install is for Windows only. On Mac/Linux, run: bash install_native_host.sh')
    else:
        main()
