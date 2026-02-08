#!/usr/bin/env bash
# Run on the CLOUD after tunnel starts (e.g. on reboot). Updates GitHub secret and triggers
# "Update API config (gh-pages)" so the live site gets the new URL — no copy/paste, no laptop.
#
# Requires: GH_TOKEN in /etc/lab-trading-dashboard.env (repo + workflow scope)
# Optional: GITHUB_REPO (default: Loveleet/lab_anish)
#
# Log: /var/log/lab-tunnel-update.log

LOG_FILE="/var/log/lab-tunnel-update.log"
log() { echo "$(date -Iseconds) $*" | tee -a "$LOG_FILE" 2>/dev/null || echo "$(date -Iseconds) $*"; }

set -e
[ -f /etc/lab-trading-dashboard.env ] && set -a && . /etc/lab-trading-dashboard.env && set +a
LOG="${1:-/var/log/cloudflared-tunnel.log}"
REPO="${GITHUB_REPO:-Loveleet/lab_anish}"
# Wait for URL to appear (tunnel can take a bit after reboot)
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  sleep 5
  [ -f "$LOG" ] || continue
  URL=$(grep -oE "https://[a-zA-Z0-9.-]+\.trycloudflare\.com" "$LOG" 2>/dev/null | tail -1)
  [ -n "$URL" ] && break
done
if [ -z "$URL" ]; then
  log "No tunnel URL found in $LOG"
  exit 1
fi
echo "$URL" > /var/run/lab-tunnel-url 2>/dev/null || true
log "Tunnel URL: $URL"
# Update GitHub secret and trigger API config update (live site picks up new URL in ~1 min)
TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"
if [ -n "$TOKEN" ]; then
  if command -v gh &>/dev/null; then
    if GH_TOKEN="$TOKEN" gh secret set API_BASE_URL --body "$URL" --repo "$REPO" 2>/dev/null; then
      log "Updated GitHub secret API_BASE_URL"
    else
      log "Warning: could not update GitHub secret (check GH_TOKEN and repo access)"
    fi
    if GH_TOKEN="$TOKEN" gh workflow run "Update API config (gh-pages)" --repo "$REPO" -f "api_url=$URL" 2>/dev/null; then
      log "Triggered Update API config (gh-pages) with URL — site will use new URL in ~1 min"
    else
      log "Warning: could not trigger workflow (check GH_TOKEN has workflow scope)"
    fi
  else
    log "Install gh CLI: apt install gh"
  fi
else
  log "Set GH_TOKEN in /etc/lab-trading-dashboard.env to auto-update (no copy/paste)"
fi
