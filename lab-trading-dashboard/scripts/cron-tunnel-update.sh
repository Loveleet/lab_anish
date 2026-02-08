#!/usr/bin/env bash
# Wrapper for crontab: wait for tunnel to be ready then run update script.
# Use with: @reboot sleep 90 && /opt/apps/lab-trading-dashboard/scripts/cron-tunnel-update.sh
# Or: */5 * * * * /opt/apps/lab-trading-dashboard/scripts/cron-tunnel-update.sh
SCRIPT_DIR="/opt/apps/lab-trading-dashboard/scripts"
LOG="/var/log/lab-tunnel-update.log"
echo "$(date -Iseconds) cron-tunnel-update: starting" >> "$LOG" 2>/dev/null || true
[ -f "$SCRIPT_DIR/update-github-secret-from-tunnel.sh" ] && "$SCRIPT_DIR/update-github-secret-from-tunnel.sh" >> "$LOG" 2>&1 || true
