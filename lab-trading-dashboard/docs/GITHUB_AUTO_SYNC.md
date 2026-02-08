# Step-by-step: Auto-sync with GitHub + App runs on boot

Two things:

1. **App runs all the time** — starts when the server boots, restarts if it crashes.
2. **Push to GitHub → cloud updates** — push to `main` and the cloud pulls and restarts automatically.

---

## Part 1: Make the app run on boot and survive crashes

The app is managed by **systemd**. You only need to ensure the service is installed and **enabled**.

### Option A — From your laptop (one command)

From the repo root, with `.env` containing `DEPLOY_HOST` and `DEPLOY_PASSWORD`:

```bash
./scripts/run-ensure-on-boot-on-cloud.sh
```

This SSHs to the cloud and installs/enables the systemd service so that:

- The app **starts when the server boots**.
- If the app **crashes**, systemd **restarts it** after 10 seconds.

### Option B — On the cloud (after SSH in)

```bash
ssh root@150.241.244.130
cd /opt/apps/lab-trading-dashboard
sudo bash scripts/ensure-app-runs-on-boot.sh
```

### Verify

- **Status:** `sudo systemctl status lab-trading-dashboard`
- **Logs:** `journalctl -u lab-trading-dashboard -f`
- **Reboot test:** Reboot the server; after it comes back, open `http://150.241.244.130:10000` — the dashboard should load.

---

## Part 2: Auto-sync with GitHub (push → cloud deploys)

When you **push to the `main` branch**, GitHub Actions SSHs to your cloud and runs `deploy.sh` (pull, build, restart). No need to run `upload-dist.sh` manually.

### Step 1: Create an SSH key for GitHub Actions (on your laptop, one-time)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/lab_deploy_key -N "" -C "github-actions-deploy"
```

- **Private key** → you’ll put this in GitHub Secrets.
- **Public key** → you’ll put this on the cloud so GitHub can SSH in.

### Step 2: Add the public key to the cloud server

```bash
# From your laptop (use your .env DEPLOY_HOST and DEPLOY_PASSWORD)
ssh-copy-id -i ~/.ssh/lab_deploy_key.pub root@150.241.244.130
```

If you use password auth:

```bash
# If you have sshpass and DEPLOY_PASSWORD in .env:
cd /path/to/lab-trading-dashboard && . .env
sshpass -e ssh-copy-id -i ~/.ssh/lab_deploy_key.pub -o StrictHostKeyChecking=no root@150.241.244.130
```

Test SSH with the key (no password):

```bash
ssh -i ~/.ssh/lab_deploy_key root@150.241.244.130 "echo OK"
```

You should see `OK` without being asked for a password.

### Step 3: Add GitHub Secrets

1. Open your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret** for each:

| Name        | Value                          |
|-------------|--------------------------------|
| `SSH_HOST`  | `150.241.244.130`              |
| `SSH_USER`  | `root`                         |
| `SSH_KEY`   | Paste the **private** key: `cat ~/.ssh/lab_deploy_key` (entire output) |
| `SSH_PORT`  | (optional) `22`                |
| `APP_PATH`  | (optional) Only if your app is **not** at `/opt/apps/<repo-name>`. Use `/opt/apps/lab-trading-dashboard` if you cloned with that folder name. |

If your GitHub repo name is `lab_anish`, the workflow will use `/opt/apps/lab_anish` by default. If you actually cloned the repo as `lab-trading-dashboard` on the server, add secret **`APP_PATH`** = **`/opt/apps/lab-trading-dashboard`**.

### Step 4: Ensure the app path on the cloud matches

The workflow will run:

- `cd $APP_PATH`
- `./deploy.sh` (or equivalent: git pull, npm ci, build, copy server.example.js → server.js, restart)

So on the cloud you must have the repo at the path you set (or the default `/opt/apps/<repo-name>`). For example:

- Repo name on GitHub: **lab_anish** → path must be **/opt/apps/lab_anish** (or set secret **APP_PATH** = **/opt/apps/lab-trading-dashboard** if that’s where you put it).
- Repo name on GitHub: **lab-trading-dashboard** → path must be **/opt/apps/lab-trading-dashboard**.

If you only ever used `upload-dist.sh` and never cloned the repo on the server, clone it once:

```bash
ssh root@150.241.244.130
sudo mkdir -p /opt/apps
git clone https://github.com/Loveleet/lab_anish.git /opt/apps/lab_anish
# Or, if you want path lab-trading-dashboard:
# git clone https://github.com/Loveleet/lab_anish.git /opt/apps/lab-trading-dashboard
```

Then run Part 1 (ensure-app-runs-on-boot) so systemd uses the correct path, and set **APP_PATH** if you used `lab-trading-dashboard`.

### Step 5: Trigger a deploy

- **Push to `main`** — workflow runs automatically.
- Or: **Actions** tab → **Deploy to Ubuntu** → **Run workflow**.

Check the **Actions** tab for success or errors.

---

## Summary

| Goal                         | What to do |
|-----------------------------|------------|
| App starts on server reboot | Run `./scripts/run-ensure-on-boot-on-cloud.sh` once (or run `ensure-app-runs-on-boot.sh` on the server). |
| App restarts when it crashes| Same — systemd has `Restart=always`. |
| Push to GitHub → cloud updates | Add SSH key to cloud, add secrets `SSH_HOST`, `SSH_USER`, `SSH_KEY` (and `APP_PATH` if path differs). Push to `main`. |

After this, you only need to **push to `main`**; the cloud will stay in sync and the app will keep running across reboots and crashes.
