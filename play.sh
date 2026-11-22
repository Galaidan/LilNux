#!/bin/bash
# Start LilNux in your web browser (Firefox on Fedora).
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAGE="$DIR/index.html"

if command -v firefox >/dev/null 2>&1; then
    firefox --new-window "file://$PAGE" >/dev/null 2>&1 &
elif command -v flatpak >/dev/null 2>&1 && flatpak info org.mozilla.firefox >/dev/null 2>&1; then
    flatpak run org.mozilla.firefox --new-window "file://$PAGE" >/dev/null 2>&1 &
else
    xdg-open "$PAGE" >/dev/null 2>&1 &
fi
echo "🐧 LilNux is opening in your browser. Have fun!"
