#!/usr/bin/env bash
# Run from your laptop: push script to cloud, reinstall crontab, and optionally trigger workflow.
# Usage: ./scripts/fix-api-config-and-cloud.sh [tunnel_url]
# If tunnel_url is provided (e.g. https://xxx.trycloudflare.com), reminds you to run the workflow with it.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"
[ -f .env ] && set -a && . ./.env && set +a
[ -f ../.env ] && set -a && . ../.env && set +a

DEPLOY_HOST="${DEPLOY_HOST:-root@150.241.244.130}"
APP_DIR="/opt/apps/lab-trading-dashboard"
TUNNEL_URL="${1:-}"

SSH_OPTS="-o StrictHostKeyChecking=no"
if [ -n "${DEPLOY_PASSWORD:-}" ] && command -v sshpass &>/dev/null; then
  export SSHPASS="$DEPLOY_PASSWORD"
  RUN_SCP="sshpass -e scp $SSH_OPTS"
  RUN_SSH="sshpass -e ssh $SSH_OPTS"
else
  RUN_SCP="scp $SSH_OPTS"
  RUN_SSH="ssh $SSH_OPTS"
fi

echo "→ Copying update script to cloud..."
$RUN_SCP \
  "$SCRIPT_DIR/update-github-secret-from-tunnel.sh" \
  "$SCRIPT_DIR/cron-tunnel-update.sh" \
  "$SCRIPT_DIR/install-cron-tunnel-update.sh" \
  "$DEPLOY_HOST:$APP_DIR/scripts/"

echo "→ Installing crontab on cloud..."
$RUN_SSH "$DEPLOY_HOST" "chmod +x $APP_DIR/scripts/*.sh && sudo $APP_DIR/scripts/install-cron-tunnel-update.sh"

echo ""
echo "✅ Cloud updated. Crontab will run the script @reboot (after 90s) and every 10 min."
if [ -n "$TUNNEL_URL" ]; then
  echo ""
  echo "→ Update live site NOW: run the workflow with this URL:"
  echo "  $TUNNEL_URL"
  echo "  GitHub: Actions → Update API config (gh-pages) → Run workflow → api_url = (paste above)"
fi
echo ""
echo "After you RESTART the cloud:"
echo "  1. Wait ~2 min for crontab to run and workflow to complete."
echo "  2. Hard-refresh https://loveleet.github.io/lab_anish/"
echo "  3. On cloud, check: ssh $DEPLOY_HOST 'tail -30 /var/log/lab-tunnel-update.log'"
