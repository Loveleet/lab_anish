# Fixed API URL (nothing to do on reboot)

If you use a **quick tunnel** (`cloudflared tunnel --url http://localhost:10000`), the URL changes every time the cloud or tunnel restarts, so the GitHub Pages frontend would need a new deploy each time.

To **do nothing on reboot**, use a **named Cloudflare Tunnel** with a hostname. The URL stays the same (e.g. `https://api.yourdomain.com`).

---

## One-time setup

You need a domain (or subdomain) that Cloudflare manages (add the domain in Cloudflare DNS).

### 1. Create the tunnel in Cloudflare

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels**.
2. **Add a tunnel** → **Cloudflared** → name it (e.g. `lab-api`) → **Save tunnel**.
3. On the **Install connector** step: pick **Linux**, copy the **install** command and the **run** command (you’ll need both on the cloud).

### 2. Route a hostname to your API

In the same tunnel:

1. **Public Hostname** → **Add a hostname**.
2. **Subdomain** (or domain): e.g. `api` → full hostname `api.yourdomain.com`.
3. **Service type**: HTTP.
4. **URL**: `localhost:10000`.
5. Save.

Your fixed API URL is then **`https://api.yourdomain.com`** (use your real hostname).

### 3. Run the tunnel on the cloud (instead of quick tunnel)

SSH to the cloud and:

1. **Install** cloudflared using the install command from step 1 (or your package manager).
2. **Authenticate** and run the tunnel using the **run** command from step 1.  
   It will look like:  
   `cloudflared tunnel run --token <token>`  
   or  
   `cloudflared tunnel run <tunnel-uuid>`  
   (with a config file and credentials in place).

To run it as a service: put that run command in a systemd unit (replace the current `ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:10000` with the named-tunnel run command and restart the service).

### 4. Set the fixed URL in GitHub and deploy once

1. **GitHub** → repo **Settings** → **Secrets and variables** → **Actions** → set **API_BASE_URL** = `https://api.yourdomain.com` (your hostname from step 2, no trailing slash).
2. **Actions** → **Deploy frontend to GitHub Pages** → **Run workflow** (or push to `lab_live`).

After that, when the cloud reboots, the tunnel reconnects to the **same** hostname. No script, no redeploy, no action needed.
