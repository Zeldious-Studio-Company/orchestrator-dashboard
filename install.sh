#!/bin/sh
# Installs orchestrator-dashboard without git and without a GitHub account (the repository is public).
#   curl -fsSL https://raw.githubusercontent.com/Zeldious-Studio-Company/orchestrator-dashboard/main/install.sh | sh
# Options (environment variables):
#   ORCH_DASHBOARD_REF   branch or tag to install (default: main)
#   ORCH_DASHBOARD_DIR   install folder (default: ~/.local/share/orchestrator-dashboard)
#   ORCH_DASHBOARD_BIN   folder for the launcher (default: ~/.local/bin)
set -eu

REPO="Zeldious-Studio-Company/orchestrator-dashboard"
REF="${ORCH_DASHBOARD_REF:-main}"
DIR="${ORCH_DASHBOARD_DIR:-$HOME/.local/share/orchestrator-dashboard}"
BIN="${ORCH_DASHBOARD_BIN:-$HOME/.local/bin}"

fail() { echo "orchestrator-dashboard: $*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || fail "Node.js 18+ is required (https://nodejs.org)."
MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$MAJOR" -ge 18 ] || fail "Node.js 18+ is required (found $(node -v))."
command -v tar >/dev/null 2>&1 || fail "tar is required."

case "$REF" in v[0-9]*) KIND=tags ;; *) KIND=heads ;; esac
URL="https://codeload.github.com/$REPO/tar.gz/refs/$KIND/$REF"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT INT TERM

echo "Downloading $REPO@$REF..."
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$URL" -o "$TMP/src.tar.gz"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP/src.tar.gz" "$URL"
else
  fail "curl or wget is required."
fi
mkdir "$TMP/src"
tar -xzf "$TMP/src.tar.gz" -C "$TMP/src" --strip-components=1
[ -f "$TMP/src/server.cjs" ] || fail "unexpected archive content."

# Stop a running server from a previous install before replacing its files.
if [ -f "$DIR/server.cjs" ]; then node "$DIR/server.cjs" stop >/dev/null 2>&1 || true; fi
rm -rf "$DIR"
mkdir -p "$(dirname "$DIR")"
mv "$TMP/src" "$DIR"

mkdir -p "$BIN"
cat > "$BIN/orchestrator-dashboard" <<EOF
#!/bin/sh
exec node "$DIR/server.cjs" "\$@"
EOF
chmod +x "$BIN/orchestrator-dashboard"

echo "Installed in $DIR"
echo "Command: $BIN/orchestrator-dashboard"
case ":$PATH:" in
  *":$BIN:"*) ;;
  *) echo "Add $BIN to your PATH to call it as 'orchestrator-dashboard' (e.g. echo 'export PATH=\"$BIN:\$PATH\"' >> ~/.profile)." ;;
esac
echo "Try: orchestrator-dashboard start $DIR/examples"
