#!/usr/bin/env bash
# Deploy lab-trading-dashboard to this server. Run from repo root.
# On server: chmod +x deploy.sh

set -euo pipefail
cd "$(dirname "$0")"
git fetch origin main
git reset --hard origin/main
npm ci
VITE_API_BASE_URL= npm run build
cd server && npm ci && cd ..
sudo systemctl restart lab-trading-dashboard
echo "Deploy done."
