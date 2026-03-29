# Production Deployment Guide — Windows Server

Assumes PostgreSQL 17.9 is already installed and running on the Windows Server.

---

## Prerequisites

- Windows Server with PostgreSQL 17.9 installed and running
- Python 3.9+ installed
- Node.js 18+ installed (for building the React frontend)
- Git (to clone the repo)

---

## Step 1: Clone and Set Up the Project

```bat
cd C:\
git clone <repo-url> ClientPortal
cd ClientPortal
```

## Step 2: Create Python Virtual Environment

```bat
python -m venv services\venv
services\venv\Scripts\activate
pip install -r services\requirements.txt
```

Verify psycopg2 can connect to PostgreSQL:

```bat
python -c "import psycopg2; print('psycopg2 OK')"
```

## Step 3: Create the PostgreSQL Database

Open a command prompt (or use pgAdmin):

```bat
"C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres client_portal
```

Or via psql:

```bat
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE client_portal;"
```

> Adjust the path to match your PostgreSQL installation directory.

If using a dedicated database user (recommended):

```sql
CREATE USER client_portal_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE client_portal TO client_portal_user;
-- After connecting to client_portal database:
GRANT ALL ON SCHEMA public TO client_portal_user;
```

## Step 4: Configure the Application

```bat
copy config.env.example config.env
notepad config.env
```

Set these values in `config.env`:

```ini
# Database — use credentials from Step 3
DATABASE_URI=postgresql://client_portal_user:your_secure_password@localhost:5432/client_portal

# API Server
API_HOST=0.0.0.0
API_PORT=5000
API_DEBUG=false

# Network Security
LAN_ONLY=true
ALLOWED_IPS=
ALLOWED_ORIGINS=

# Backups
BACKUP_DIR=C:\ClientPortal\backups
BACKUP_API_URL=http://127.0.0.1:5000/api/export
BACKUP_MAX_COUNT=30
```

## Step 5: Build the React Frontend

```bat
cd webapp\customer-app
npm install
npm run build
cd ..\..
```

This creates the production build in `webapp\customer-app\build\` which Flask serves directly.

## Step 6: Initialize the Database and Start the App

First start creates all tables automatically via `db.create_all()`:

```bat
start-all.bat
```

This starts:
1. **API Server** — Flask on port 5000 (serves both API and React frontend)
2. **Backup Scheduler** — XLSX exports at 12 AM and 12 PM daily
3. **React Dev Server** — port 3000 (optional, for development only)

Verify:
- Open `http://localhost:5000` — app should load
- Open `http://localhost:5000/api/health` — should return 200

## Step 7: Import Data

If migrating from an existing SQLite installation, use the pre-migration XLSX export:

**Option A — Via the app UI:**
1. Open `http://localhost:5000`
2. Use the Import function to upload the XLSX file

**Option B — Via curl:**

```bat
curl -X POST -F "file=@pre_migration_export.xlsx" http://127.0.0.1:5000/api/import
```

**Option C — Via the standalone import script** (for the original `Data Sheet.xlsx` format):

```bat
services\venv\Scripts\activate
set DATABASE_URI=postgresql://client_portal_user:your_secure_password@localhost:5432/client_portal
python services\db\import_from_excel.py
```

## Step 8: Verify the Deployment

```bat
REM Check tables exist
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U client_portal_user -d client_portal -c "\dt"

REM Check row counts
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U client_portal_user -d client_portal -c "SELECT 'clients' as tbl, COUNT(*) FROM clients UNION ALL SELECT 'employee_benefits', COUNT(*) FROM employee_benefits UNION ALL SELECT 'commercial_insurance', COUNT(*) FROM commercial_insurance;"

REM Test export endpoint
curl -o test_export.xlsx http://127.0.0.1:5000/api/export
```

---

## Stopping Services

```bat
stop-all.bat
```

---

## Backup & Recovery

### Automatic Backups

The backup scheduler runs automatically (started by `start-all.bat`):
- Exports to XLSX at **12:00 AM** and **12:00 PM** daily
- Saves to `BACKUP_DIR` (default: `C:\ClientPortal\backups`)
- Keeps the most recent 30 backups (configurable via `BACKUP_MAX_COUNT`)

### Manual Backup

```bat
curl -o "C:\ClientPortal\backups\manual_backup_%date:~-4%%date:~4,2%%date:~7,2%.xlsx" http://127.0.0.1:5000/api/export
```

### PostgreSQL Database Backup (Full)

```bat
"C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -U client_portal_user client_portal > C:\ClientPortal\backups\db_backup.sql
```

### Restore from XLSX

1. Drop and recreate the database (or truncate tables)
2. Start the app (recreates empty tables)
3. Import the XLSX via `/api/import`

### Restore from pg_dump

```bat
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U client_portal_user -d client_portal < C:\ClientPortal\backups\db_backup.sql
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `psycopg2` import error | Verify `pip install psycopg2-binary` in the venv |
| Connection refused | Check PostgreSQL service is running: `sc query postgresql-x64-17` |
| Authentication failed | Verify credentials in `config.env` match the database user |
| Port 5000 in use | Change `API_PORT` in `config.env`, or stop the conflicting process |
| Tables not created | App creates tables on startup — check logs in the API window |
| Health check fails on start | Wait a few more seconds; increase timeout in `start-all.bat` |

---

## File Layout on Server

```
C:\ClientPortal\
  config.env                          # Production config (DO NOT commit)
  start-all.bat                       # Start all services
  stop-all.bat                        # Stop all services
  services\
    venv\                             # Python virtual environment
    api\customer_api.py               # Flask API + React SPA server
    backup_scheduler.py               # Scheduled XLSX backups
    requirements.txt                  # Python dependencies
    db\schema.sql                     # PostgreSQL schema reference
  webapp\customer-app\
    build\                            # React production build (served by Flask)
  backups\                            # XLSX backup files
```
