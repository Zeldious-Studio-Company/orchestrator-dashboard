#!/bin/sh
# Installs orchestrator-dashboard without git and without a GitHub account (the repository is public).
# Download, check, read, then run (do not pipe it into a shell):
#   curl -fsSL -o install.sh https://raw.githubusercontent.com/Zeldious-Studio-Company/orchestrator-dashboard/v1.0.0/install.sh
#   less install.sh
#   sh install.sh
# Options (environment variables):
#   ORCH_DASHBOARD_REF      tag or branch to install (default: v1.0.0, a fixed release, not main)
#   ORCH_DASHBOARD_SHA256   expected SHA256 of the downloaded archive; the install stops on mismatch
#   ORCH_DASHBOARD_DIR      install folder (default: ~/.local/share/orchestrator-dashboard)
#   ORCH_DASHBOARD_BIN      folder for the launcher (default: ~/.local/bin)
set -eu

REPO="Zeldious-Studio-Company/orchestrator-dashboard"
REF="${ORCH_DASHBOARD_REF:-v1.0.0}"
DIR="${ORCH_DASHBOARD_DIR:-$HOME/.local/share/orchestrator-dashboard}"
BIN="${ORCH_DASHBOARD_BIN:-$HOME/.local/bin}"
SHA256="${ORCH_DASHBOARD_SHA256:-}"

fail() { echo "orchestrator-dashboard: $*" >&2; exit 1; }

# An install is a folder with server.cjs and a package.json named "orchestrator-dashboard".
is_install() {
  [ -f "$1/server.cjs" ] && [ -f "$1/package.json" ] &&
    grep -Eq '"name"[[:space:]]*:[[:space:]]*"orchestrator-dashboard"' "$1/package.json"
}

command -v node >/dev/null 2>&1 || fail "Node.js 18+ is required (https://nodejs.org)."
MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$MAJOR" -ge 18 ] || fail "Node.js 18+ is required (found $(node -v))."
command -v tar >/dev/null 2>&1 || fail "tar is required."

case "$REF" in *[!A-Za-z0-9._/-]*|*..*|'') fail "invalid ORCH_DASHBOARD_REF '$REF'." ;; esac
case "$REF" in v[0-9]*) KIND=tags ;; *) KIND=heads ;; esac
URL="https://codeload.github.com/$REPO/tar.gz/refs/$KIND/$REF"

if [ -n "$SHA256" ]; then
  EXPECTED=$(printf '%s' "$SHA256" | tr 'A-F' 'a-f')
  case "$EXPECTED" in *[!0-9a-f]*) fail "ORCH_DASHBOARD_SHA256 must be a 64-character hex SHA256." ;; esac
  [ "${#EXPECTED}" -eq 64 ] || fail "ORCH_DASHBOARD_SHA256 must be a 64-character hex SHA256."
fi

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

if [ -n "$SHA256" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL=$(sha256sum "$TMP/src.tar.gz" | cut -d' ' -f1)
  elif command -v shasum >/dev/null 2>&1; then
    ACTUAL=$(shasum -a 256 "$TMP/src.tar.gz" | cut -d' ' -f1)
  else
    fail "sha256sum or shasum is required to verify ORCH_DASHBOARD_SHA256."
  fi
  [ "$ACTUAL" = "$EXPECTED" ] || fail "SHA256 mismatch (expected $EXPECTED, got $ACTUAL). Nothing was installed."
  echo "SHA256 verified."
fi

mkdir "$TMP/src"
tar -xzf "$TMP/src.tar.gz" -C "$TMP/src" --strip-components=1
is_install "$TMP/src" || fail "unexpected archive content."

# Refuse to replace a folder that is not an orchestrator-dashboard install, since it is deleted below.
# This check runs before the old server is stopped, so a server.cjs that is not ours is never executed.
case "$DIR" in / | "$HOME") fail "refusing to use $DIR as the install folder." ;; esac
if [ -e "$DIR" ]; then
  is_install "$DIR" || fail "refusing to replace $DIR: it is not an orchestrator-dashboard install (no server.cjs and package.json named orchestrator-dashboard). Remove it yourself or set ORCH_DASHBOARD_DIR."
  # Stop a running server from a previous install before replacing its files.
  node "$DIR/server.cjs" stop >/dev/null 2>&1 || true
  rm -rf "$DIR"
fi
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
