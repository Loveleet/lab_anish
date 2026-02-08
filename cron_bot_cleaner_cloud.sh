#!/bin/bash
# Cloud (Ubuntu) crontab script for Tmux Bot Cleaner — use this on the server, NOT cron_bot_cleaner.sh (that one has Mac paths).
# Add to crontab on cloud: @reboot /home/ubuntu/lab_code/cron_bot_cleaner_cloud.sh
# Or if code is under root: @reboot /root/lab_code/cron_bot_cleaner_cloud.sh

# Cloud paths (adjust if your code lives elsewhere, e.g. /root/lab_code)
SCRIPT_DIR="${BOT_CLEANER_DIR:-/home/ubuntu/lab_code}"
SCRIPT_NAME=""
for name in tmux_bot_cleaner_postgrey.py tmux_bot_cleaner.py; do
  [ -f "$SCRIPT_DIR/$name" ] && SCRIPT_NAME="$name" && break
done
if [ -z "$SCRIPT_NAME" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] No tmux_bot_cleaner*.py found in $SCRIPT_DIR" >> "${SCRIPT_DIR}/TmuxCleaner/cron.log" 2>/dev/null || true
  exit 1
fi

PID_FILE="/tmp/tmux_bot_cleaner.pid"
LOG_DIR="${SCRIPT_DIR}/TmuxCleaner"
LOG_FILE="${LOG_DIR}/cron.log"
mkdir -p "$LOG_DIR"

log_msg() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Wait for system to be ready
sleep 60

# Wait for PostgreSQL to be ready (optional; remove if not needed)
for i in 1 2 3 4 5 6 7 8 9 10; do
  if pgrep -x "postgres" > /dev/null 2>&1; then
    break
  fi
  log_msg "Waiting for PostgreSQL to start..."
  sleep 10
done

cd "$SCRIPT_DIR" || { log_msg "ERROR: Cannot cd to $SCRIPT_DIR"; exit 1; }

# Start the script
nohup python3 "$SCRIPT_NAME" >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
log_msg "Bot cleaner started with PID: $(cat $PID_FILE) ($SCRIPT_NAME)"

# Monitor and restart if needed (runs every 5 minutes)
while true; do
  sleep 300
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ! ps -p "$PID" > /dev/null 2>&1; then
      log_msg "Bot cleaner died, restarting..."
      cd "$SCRIPT_DIR" || continue
      nohup python3 "$SCRIPT_NAME" >> "$LOG_FILE" 2>&1 &
      echo $! > "$PID_FILE"
      log_msg "Bot cleaner restarted with PID: $(cat $PID_FILE)"
    fi
  else
    log_msg "PID file missing, starting bot cleaner..."
    cd "$SCRIPT_DIR" || continue
    nohup python3 "$SCRIPT_NAME" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    log_msg "Bot cleaner started with PID: $(cat $PID_FILE)"
  fi
done
