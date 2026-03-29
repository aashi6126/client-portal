# SQLite to PostgreSQL 17.9 Migration

**Date:** 2026-03-29
**Approach:** Minimal swap (Approach A)

## Summary

Migrate the Client Portal database from SQLite (file-based) to PostgreSQL 17.9. The app uses SQLAlchemy 2.0 as its ORM, so most code is already database-agnostic. The migration involves updating the connection config, adding the PostgreSQL driver, removing SQLite-specific code, and converting the reference schema.

## Environment

- **Development:** macOS, PostgreSQL 17.9 via Homebrew
- **Production:** Windows Server, PostgreSQL 17.9
- **No Docker** — PostgreSQL installed directly on both environments

## Pre-Migration: Backup & Data Export

Before any code changes:

1. **Copy `services/customer.db`** to `services/customer.db.bak`
2. **Export current data** via the existing `/api/export` endpoint to generate an XLSX snapshot
3. Store the XLSX alongside the backup for safekeeping

After migration is complete, reload data via the `/api/import` endpoint (which uses SQLAlchemy and is already database-agnostic).

## Changes

### 1. Add PostgreSQL Driver

**File:** `services/requirements.txt`

Add `psycopg2-binary` (PostgreSQL adapter for SQLAlchemy).

### 2. Update Database Connection

**File:** `services/api/customer_api.py` (lines 117-135)

- Change the default `DATABASE_URI` from `sqlite:///...` to `postgresql://localhost/client_portal`
- Remove the SQLite directory-creation block (lines 121-128) that checks for `sqlite` prefix and creates directories

### 3. Remove Auto-Migration Code

**File:** `services/api/customer_api.py` (lines 4277-4342)

Delete the entire SQLite PRAGMA-based auto-migration block. This code:
- Imports `sqlite3`
- Uses `PRAGMA table_info()` to detect missing columns
- Runs `ALTER TABLE ADD COLUMN` for missing columns
- Renames `outstanding_item` values

Keep only `db.create_all()` (line 4275), which works with any SQLAlchemy-supported database.

### 4. Update Reference Schema

**File:** `services/db/schema.sql`

Convert SQLite syntax to PostgreSQL:

| SQLite | PostgreSQL |
|--------|-----------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| `BOOLEAN DEFAULT 0` | `BOOLEAN DEFAULT FALSE` |

Everything else (VARCHAR, TEXT, DECIMAL, DATE, TIMESTAMP, FOREIGN KEY, indexes, `CREATE TABLE IF NOT EXISTS`) is already PostgreSQL-compatible.

### 5. Update Configuration Template

**File:** `config.env.example`

- Change `DATABASE_URI` example to `postgresql://username:password@localhost:5432/client_portal`
- Update comments for both macOS dev and Windows Server production formats
- Remove SQLite-specific path comments

### 6. Update Test Configuration

**File:** `services/tests/conftest.py` (line 13)

Keep `sqlite:///:memory:` for tests. The SQLAlchemy models are database-agnostic and the test fixtures don't use PostgreSQL-specific features. Fast in-memory tests are preferred.

### 7. Update Standalone Import Script

**File:** `services/db/import_from_excel.py`

This script uses raw `sqlite3` directly. Update it to use SQLAlchemy so it works with any configured database. Alternatively, mark it as deprecated in favor of the API-based `/api/import` endpoint which already uses SQLAlchemy.

**Recommendation:** Update to use SQLAlchemy for consistency. It should read `DATABASE_URI` from environment and use the same engine/session pattern as the main app.

## Files NOT Changed

- **`services/main.py`** — Sample/unused script, leave as-is
- **`services/db/migrate_*.py`** (20+ files) — Historical SQLite migration scripts. No longer needed since auto-migration is removed and we're starting fresh with `db.create_all()`. Left as historical reference.
- **API endpoints** — All use SQLAlchemy models, no raw SQL changes needed
- **Frontend** — No database awareness, unaffected

## PostgreSQL Setup (Developer Reference)

```bash
# Install
brew install postgresql@17

# Start service
brew services start postgresql@17

# Create database
createdb client_portal

# Set environment variable
export DATABASE_URI=postgresql://localhost/client_portal
```

## Data Reload

After migration and PostgreSQL setup:

1. Start the app (runs `db.create_all()` to create tables in PostgreSQL)
2. Use the `/api/import` endpoint to upload the XLSX exported pre-migration
3. Verify data via the app UI

## Out of Scope

- Alembic migration framework (can be added later)
- Docker containerization
- Data migration script (using XLSX export/import instead)
- Changes to the 20+ historical migration scripts
