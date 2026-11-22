#!/bin/bash
# Adds LilNux to the GNOME app grid, so everyone can start it from Activities.
#   ./install-shortcut.sh           install for the current user
#   ./install-shortcut.sh --remove  remove it again
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPS="$HOME/.local/share/applications"
FILE="$APPS/lilnux.desktop"

if [ "$1" = "--remove" ]; then
    rm -f "$FILE"
    echo "LilNux shortcut removed."
    exit 0
fi

chmod +x "$DIR/play.sh"
mkdir -p "$APPS"
cat > "$FILE" <<EOF
[Desktop Entry]
Type=Application
Name=LilNux
Comment=A family game for learning Fedora and Linux
Exec="$DIR/play.sh"
Icon=$DIR/assets/lilnux.svg
Terminal=false
Categories=Education;Game;
Keywords=linux;fedora;learn;terminal;game;
EOF
chmod +x "$FILE"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS" >/dev/null 2>&1 || true
echo "✅ Done! Press the Super key and type LilNux to start the game."
