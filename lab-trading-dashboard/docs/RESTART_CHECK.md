# After cloud restart – check that the site still works

## What’s in place

1. **GitHub:** Workflow **Update API config (gh-pages)** accepts an optional input `api_url`. When the cloud triggers it (or you run it manually), it updates `api-config.json` on gh-pages so the live site uses the current tunnel URL.
2. **Cloud:** Crontab runs the update script **@reboot** (after 90s) and **every 10 min**. The script reads the new tunnel URL from the log, updates the GitHub secret, and triggers the workflow with that URL.
3. **Frontend:** Loads `api-config.json` at runtime and refetches data when it loads.

## One-time: update the live site with the current URL

If the site is still using an old tunnel URL:

1. Open **https://github.com/Loveleet/lab_anish/actions**
2. Click **Update API config (gh-pages)** → **Run workflow**
3. Set **api_url** to the current tunnel URL (e.g. from `http://150.241.244.130:10000/api/tunnel-url` or from the script output).
4. Click **Run workflow**, wait for it to finish, then hard-refresh **https://loveleet.github.io/lab_anish/**

## After you restart the cloud

1. Wait **about 2 minutes** (crontab runs 90s after boot, then the workflow runs).
2. Hard-refresh the dashboard (Ctrl+Shift+R). Data should load.
3. If it doesn’t, on the cloud run:  
   `tail -50 /var/log/lab-tunnel-update.log`  
   You should see “Triggered Update API config (gh-pages) with URL”. If you see “could not trigger workflow” or “Set GH_TOKEN”, the auto-update didn’t run because **GH_TOKEN** is missing.

## If auto-update didn’t run after restart (fix for next time)

The script needs **GH_TOKEN** on the cloud to trigger the workflow. No token = no auto-update.

1. **On the cloud**, create or edit `/etc/lab-trading-dashboard.env`:
   ```bash
   sudo bash -c 'echo "GH_TOKEN=ghp_YOUR_TOKEN_HERE" >> /etc/lab-trading-dashboard.env'
   sudo chmod 600 /etc/lab-trading-dashboard.env
   ```
   Use a GitHub **Personal Access Token** (classic or fine-grained) with **repo** and **workflow** scope for `Loveleet/lab_anish`. The script works with **curl** (no `gh` CLI required).

2. **Copy the latest script** from the repo to the cloud so the curl fallback and log search are in place:
   ```bash
   scp lab-trading-dashboard/scripts/update-github-secret-from-tunnel.sh root@150.241.244.130:/opt/apps/lab-trading-dashboard/scripts/
   ssh root@150.241.244.130 '/opt/apps/lab-trading-dashboard/scripts/install-cron-tunnel-update.sh'
   ```

3. After the next reboot, check again: `tail -30 /var/log/lab-tunnel-update.log`

## Re-sync cloud scripts and crontab (from laptop)

```bash
cd lab-trading-dashboard
./scripts/fix-api-config-and-cloud.sh "https://current-tunnel.trycloudflare.com"
```

Then run the workflow once with that URL (or wait for crontab after the next reboot).
