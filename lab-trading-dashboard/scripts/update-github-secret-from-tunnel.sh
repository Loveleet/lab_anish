#!/usr/bin/env bash
# Run on the CLOUD. Reads the tunnel URL from the log and updates GitHub secret API_BASE_URL
# so GitHub Pages builds use the correct HTTPS API URL. No laptop needed.
#
# Requires: GH_TOKEN or GITHUB_TOKEN in env (e.g. from /etc/lab-trading-dashboard.env)
#   Create at: https://github.com/settings/tokens (repo scope, or fine-grained: Actions secrets write)
# Optional: GITHUB_REPO (default: Loveleet/lab_anish)

set -e
LOG="${1:-/var/log/cloudflared-tunnel.log}"
REPO="${GITHUB_REPO:-Loveleet/lab_anish}"
# Wait for URL to appear
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 3
  [ -f "$LOG" ] || continue
  URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.trycloudflare\.com" "$LOG" 2>/dev/null | tail -1)
  [ -n "$URL" ] && break
done
if [ -z "$URL" ]; then
  echo "No tunnel URL found in $LOG"
  exit 1
fi
echo "$URL" > /var/run/lab-tunnel-url 2>/dev/null || true
echo "Tunnel URL: $URL"
# Update GitHub secret if token is set
TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"
if [ -n "$TOKEN" ]; then
  if command -v gh &>/dev/null; then
    GH_TOKEN="$TOKEN" gh secret set API_BASE_URL --body "$URL" --repo "$REPO" && echo "Updated GitHub secret API_BASE_URL"
  else
    echo "Install gh CLI to auto-update GitHub secret: apt install gh"
  fi
else
  echo "Set GH_TOKEN in /etc/lab-trading-dashboard.env to auto-update GitHub secret."
fi
