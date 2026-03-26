#!/usr/bin/env bash
set -e

SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd)
NATIVE_HOST_SCRIPT="$SCRIPT_DIR/native_host.py"

echo ""
echo "PESU Slide Downloader — Native Host Setup"
echo "=========================================="
echo ""
echo "This installs the LibreOffice conversion bridge so the extension can"
echo "convert PPT/PPTX files to PDF."
echo ""
echo "Steps:"
echo "  1. Open Chrome and go to:  chrome://extensions"
echo "  2. Find 'PESU Slide Downloader' and copy its ID"
echo "     (it looks like: abcdefghijklmnopqrstuvwxyz123456)"
echo ""
read -p "Paste the Extension ID here: " EXT_ID

if [ -z "$EXT_ID" ]; then
  echo "Error: No extension ID provided. Aborting."
  exit 1
fi

MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
mkdir -p "$MANIFEST_DIR"

MANIFEST_PATH="$MANIFEST_DIR/com.pesu.downloader.json"

cat > "$MANIFEST_PATH" << EOF
{
  "name": "com.pesu.downloader",
  "description": "PESU Slide Downloader — LibreOffice PPT to PDF converter",
  "path": "$NATIVE_HOST_SCRIPT",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXT_ID/"]
}
EOF

chmod +x "$NATIVE_HOST_SCRIPT"

echo ""
echo "Done! Installed at:"
echo "  $MANIFEST_PATH"
echo ""
echo "Next steps:"
echo "  1. Go to chrome://extensions"
echo "  2. Click the refresh icon on PESU Slide Downloader"
echo "  3. The 'Convert PPTs to PDF' toggle is now active"
echo ""
