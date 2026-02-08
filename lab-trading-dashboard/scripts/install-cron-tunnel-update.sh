#!/usr/bin/env bash
# Run ON THE CLOUD (e.g. after copying scripts). Installs crontab so the tunnel URL is
# updated and GitHub Pages gets the new API URL after reboot — no copy/paste.
#
# Usage on cloud:
#   sudo bash /opt/apps/lab-trading-dashboard/scripts/install-cron-tunnel-update.sh
# Or from laptop:
#   scp lab-trading-dashboard/scripts/{update-github-secret-from-tunnel.sh,cron-tunnel-update.sh,install-cron-tunnel-update.sh} root@150.241.244.130:/opt/apps/lab-trading-dashboard/scripts/
#   ssh root@150.241.244.130 'chmod +x /opt/apps/lab-trading-dashboard/scripts/*.sh && sudo /opt/apps/lab-trading-dashboard/scripts/install-cron-tunnel-update.sh'

set -e
SCRIPT_DIR="/opt/apps/lab-trading-dashboard/scripts"
CRON_SCRIPT="$SCRIPT_DIR/cron-tunnel-update.sh"

chmod +x "$SCRIPT_DIR/update-github-secret-from-tunnel.sh" "$CRON_SCRIPT" 2>/dev/null || true

# Add @reboot (run 90s after boot so tunnel has time to start) and every 10 min as backup
CRON_LINE1="@reboot sleep 90 && $CRON_SCRIPT"
CRON_LINE2="*/10 * * * * $CRON_SCRIPT"

# Install without duplicating
(crontab -l 2>/dev/null | grep -v "cron-tunnel-update.sh" | grep -v "update-github-secret-from-tunnel"; echo "$CRON_LINE1"; echo "$CRON_LINE2") | crontab -

echo "Crontab installed:"
echo "  $CRON_LINE1"
echo "  $CRON_LINE2"
echo "Log: /var/log/lab-tunnel-update.log"
echo "Ensure GH_TOKEN is set in /etc/lab-trading-dashboard.env"
