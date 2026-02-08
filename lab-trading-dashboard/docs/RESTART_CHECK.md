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
   You should see “Triggered Update API config (gh-pages) with URL”. If you see “could not trigger workflow”, check **GH_TOKEN** in `/etc/lab-trading-dashboard.env` (repo + workflow scope).

## Re-sync cloud scripts and crontab (from laptop)

```bash
cd lab-trading-dashboard
./scripts/fix-api-config-and-cloud.sh "https://current-tunnel.trycloudflare.com"
```

Then run the workflow once with that URL (or wait for crontab after the next reboot).
