# Make GitHub Pages work with data

To have **https://loveleet.github.io/lab_anish/** show real data (not just the UI), the API must be reachable over **HTTPS**. Use a Cloudflare Tunnel so you don’t need a domain or nginx.

---

## Zero maintenance (nothing to do on cloud reboot)

Use a **fixed API URL** so the frontend never needs updating when the cloud or tunnel restarts.

1. **Get a stable hostname** – Use a **Cloudflare named tunnel** with a hostname (e.g. a subdomain you add in Cloudflare). The URL stays the same after every reboot.
   - In [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) (or [dash.cloudflare.com](https://dash.cloudflare.com)): add your domain, then **Networks → Tunnels → Create a tunnel**.
   - Create a tunnel (e.g. "lab-api"), install `cloudflared` on the cloud, and **route** a hostname (e.g. `api.yourdomain.com`) to `http://localhost:10000`.
   - Your fixed URL is then `https://api.yourdomain.com` (or whatever hostname you chose).

2. **Set it once in GitHub** – **Settings → Secrets and variables → Actions** → set **API_BASE_URL** = `https://api.yourdomain.com` (no trailing slash).

3. **Deploy the frontend once** – **Actions → Deploy frontend to GitHub Pages** (or push to `lab_live`).

After that, **cloud reboots don't require any action** – the same URL keeps working.

---

## Runtime API URL (quick tunnel + auto-update)

If you use the **quick tunnel** (URL changes on reboot), the app **loads the API URL at runtime** from `api-config.json`:

1. **Deploy** – Run "Deploy frontend to GitHub Pages" (or push to `lab_live`). The build writes `api-config.json` with your current `API_BASE_URL` secret.
2. **Crontab on the cloud** – So the new URL is pushed to GitHub after every reboot without copy/paste:
   - Copy scripts to the cloud, then on the cloud run:  
     `sudo /opt/apps/lab-trading-dashboard/scripts/install-cron-tunnel-update.sh`  
   - This adds: **@reboot** (run 90s after boot) and **every 10 min** to run the update script (updates GitHub secret and triggers "Update API config (gh-pages)").
3. **GitHub workflow** – "Update API config (gh-pages)" also runs every 15 min as a backup. After a reboot, crontab runs first (~90s), then the site gets the new URL in ~1 min.

**Local (localhost)** – Unchanged: `npm run dev` uses the cloud IP or `.env.local`; no `api-config.json` needed.

---

## Step 1: Expose the API over HTTPS (quick tunnel)

**Option 1 – From your laptop (one command):**

```bash
cd lab-trading-dashboard
./scripts/run-tunnel-from-laptop.sh
```

If the cloud has a broken `dpkg`, fix it first: `ssh root@150.241.244.130 "sudo dpkg --configure -a"`, then run the script again. The script will print the URL to add to GitHub.

**Option 2 – On the cloud server (SSH in first):**

```bash
# From your laptop (optional): copy the script to the cloud and run it
# scp -r lab-trading-dashboard/scripts root@150.241.244.130:/tmp/
# ssh root@150.241.244.130 "bash /tmp/scripts/start-https-tunnel-for-pages.sh"

# Or on the cloud server directly (if the repo is there):
cd /opt/apps/lab-trading-dashboard
sudo bash scripts/start-https-tunnel-for-pages.sh
```

Or install and run cloudflared manually:

```bash
# On the cloud (Ubuntu):
sudo apt-get update && sudo apt-get install -y curl
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install -y cloudflared
cloudflared tunnel --url http://localhost:10000
```

**Copy the HTTPS URL** that appears (e.g. `https://abc-xyz-123.trycloudflare.com`). Leave the terminal running (or run it in tmux/screen so it keeps running).

---

## Step 2: Set the URL in GitHub

**Or get current URL from the cloud:** http://150.241.244.130:10000/api/tunnel-url

1. Open **https://github.com/Loveleet/lab_anish** → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret** (or edit existing).
3. **Name:** `API_BASE_URL`
4. **Value:** the URL you copied, e.g. `https://abc-xyz-123.trycloudflare.com` (no trailing slash).
5. Save.

---

## Step 3: Redeploy the frontend

So the new build uses the HTTPS API URL:

- **Option A:** Push any commit to `lab_live` (e.g. an empty commit: `git commit --allow-empty -m "Use HTTPS API" && git push origin lab_live`).
- **Option B:** **Actions** → **Deploy frontend to GitHub Pages** → **Run workflow** (branch: lab_live).

Wait for the workflow to finish (green).

---

## Step 4: Open the dashboard

Open **https://loveleet.github.io/lab_anish/** and do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R). Data should load.

---

## If the tunnel stops

The **quick tunnel** URL (trycloudflare.com) changes every time you restart `cloudflared`. If you restart the tunnel:

1. Copy the new HTTPS URL.
2. Update the **API_BASE_URL** secret in GitHub with that URL.
3. Run the **Deploy frontend to GitHub Pages** workflow again (or push a commit).

To keep a **stable URL**, use a [Cloudflare named tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/tunnel-useful-terms/) with a free Cloudflare account.
