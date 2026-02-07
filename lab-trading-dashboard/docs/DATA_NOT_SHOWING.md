# Why the dashboard shows no data (and how to fix it)

## Cause

On the app server (150.241.244.130), the database `labdb2` has:

- **alltraderecords**: **0 rows** → the dashboard trades grid and reports stay empty
- **machines**: 9 rows ✅
- **pairstatus**: 528 rows ✅

So the main “data” (trades) is missing because **alltraderecords is empty**. The app and API are working; there is simply no trade data in the local DB.

## Fix (choose one)

### Option 1: Copy the database from the DB server (recommended)

1. On the **DB server** (150.241.245.36):
   - Allow PostgreSQL from the app server: open **port 5432** for IP **150.241.244.130** (firewall / security group).
   - In `postgresql.conf`: `listen_addresses = '*'` (or include the app server).
   - In `pg_hba.conf`: add  
     `host  labdb2  postgres  150.241.244.130/32  scram-sha-256`

2. From your laptop (repo root):
   ```bash
   ./scripts/copy-database-to-cloud.sh
   ```
   This runs on the app server as root in `/opt`, dumps from 150.241.245.36, restores into local `labdb2`, and restarts the app.

3. Refresh **http://150.241.244.130:10000** — trades should appear.

### Option 2: Use the remote DB directly (no copy)

If you prefer the app to read from the DB server every time:

1. On the **DB server** (150.241.245.36): open port 5432 for 150.241.244.130 and set `listen_addresses` + `pg_hba.conf` as above.

2. On the **app server**, edit `/etc/lab-trading-dashboard.env`:
   ```bash
   DB_HOST=150.241.245.36
   # keep: DB_PORT=5432, DB_USER=postgres, DB_PASSWORD=IndiaNepal1-, DB_NAME=labdb2
   ```

3. Restart the app:
   ```bash
   sudo systemctl restart lab-trading-dashboard
   ```

4. Refresh **http://150.241.244.130:10000**.

---

Until 150.241.245.36:5432 is reachable from the app server (or you restore a dump that includes `alltraderecords`), the trades table will stay empty and the dashboard will show no trade data.
