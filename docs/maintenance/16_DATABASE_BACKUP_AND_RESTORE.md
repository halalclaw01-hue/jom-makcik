# Database Backup & Restore Guide

## Current Setup

| Item | Detail |
|------|--------|
| Database | SQLite 3 |
| File | `/app/data/jom-makcik.sqlite` |
| Container path | `/app/data/jom-makcik.sqlite` |
| Host path | `/var/lib/docker/volumes/trkil295kr3pg22ae1mk9o0h-jom-makcik-data/_data/jom-makcik.sqlite` |
| Size | ~164 KB (3 users, 0 bookings as of 2026-05-13) |
| Volume name | `trkil295kr3pg22ae1mk9o0h-jom-makcik-data` |
| Persistent | ✅ Survives container restarts/deploys |

## Why Persistent Volume Matters

The Docker volume maps the host path to `/app/data` inside the container. When Coolify redeploys, the old container is replaced but the volume remains. New containers mount the same volume — data survives.

**If the volume is deleted:** All data is lost permanently. Never delete this volume without a backup.

## How to Backup

### Method 1: Copy from Host (Recommended)

```bash
# SSH into VPS
ssh root@76.13.212.82

# Copy to safe location
cp /var/lib/docker/volumes/trkil295kr3pg22ae1mk9o0h-jom-makcik-data/_data/jom-makcik.sqlite \
   /root/backups/jom-makcik-$(date +%Y%m%d-%H%M%S).sqlite

# Download to local machine
scp root@76.13.212.82:/root/backups/jom-makcik-*.sqlite ./backups/
```

### Method 2: Via Docker Container

```bash
ssh root@76.13.212.82
docker cp trkil295kr3pg22ae1mk9o0h-113905054991:/app/data/jom-makcik.sqlite \
  /root/backups/jom-makcik-$(date +%Y%m%d-%H%M%S).sqlite
```

### Method 3: SQL Dump (portable format)

```bash
# On VPS
docker exec trkil295kr3pg22ae1mk9o0h-113905054991 node -e "
const Database = require('better-sqlite3');
const db = new Database('/app/data/jom-makcik.sqlite');
db.exec('.dump');
db.close();
" > /root/backups/jom-makcik-dump-$(date +%Y%m%d).sql
```

## How to Restore

### From .sqlite file

```bash
ssh root@76.13.212.82

# Stop backend (optional, safer)
# Coolify: stop from dashboard or via API

# Replace the database
cp /root/backups/jom-makcik-YYYYMMDD-HHMMSS.sqlite \
   /var/lib/docker/volumes/trkil295kr3pg22ae1mk9o0h-jom-makcik-data/_data/jom-makcik.sqlite

# Restart backend
# Coolify: redeploy from dashboard or via API
```

### From SQL dump

```bash
ssh root@76.13.212.82

docker exec trkil295kr3pg22ae1mk9o0h-113905054991 node -e "
const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('/app/data/jom-makcik.sqlite');
const dump = fs.readFileSync('/path/to/dump.sql', 'utf8');
db.exec(dump);
db.close();
"
```

## Verify Backup

```bash
# Check file size
ls -lh /root/backups/jom-makcik-*.sqlite

# Verify with sqlite3 CLI
sqlite3 /root/backups/jom-makcik-*.sqlite "SELECT count(*) FROM users;"
sqlite3 /root/backups/jom-makcik-*.sqlite "SELECT name, role FROM users;"
sqlite3 /root/backups/jom-makcik-*.sqlite ".tables"
```

## What NOT to Do

- ❌ **Do not delete the Docker volume** (`docker volume rm trkil295kr3pg22ae1mk9o0h-jom-makcik-data`)
- ❌ **Do not delete the Coolify application** — this may remove the volume
- ❌ **Do not run `db:reset`** on production — it drops all tables
- ❌ **Do not replace the database file while backend is writing to it** — stop the backend first
- ❌ **Do not commit the database to Git**

## Backup Frequency Recommendation

| Environment | Frequency | Retention |
|-------------|-----------|-----------|
| Production MVP | Daily | 7 days |
| Before deploy | Every deploy | Keep latest 3 |
| Before schema change | Manual | Keep forever |

## Future PostgreSQL Migration Note

Currently using SQLite for MVP simplicity. If migrating to PostgreSQL later:

1. Export SQLite data as SQL
2. Adjust SQL syntax (AUTOINCREMENT → SERIAL, TEXT dates → TIMESTAMP)
3. Import into PostgreSQL
4. Update `DATABASE_PATH` → `DATABASE_URL` env var
5. Update `db/connection.js` to use `pg` instead of `better-sqlite3`

This migration is **not recommended during MVP** — SQLite handles the current load perfectly.
