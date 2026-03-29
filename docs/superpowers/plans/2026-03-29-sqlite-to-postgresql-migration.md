# SQLite to PostgreSQL 17.9 Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Client Portal from SQLite to PostgreSQL 17.9 while preserving all data via XLSX export/import.

**Architecture:** Swap the database driver and connection URI, remove SQLite-specific auto-migration code, convert the reference schema to PostgreSQL syntax. SQLAlchemy ORM abstracts the rest — all API endpoints and models work unchanged.

**Tech Stack:** Python 3, Flask, SQLAlchemy 2.0, psycopg2-binary, PostgreSQL 17.9 (Homebrew)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `services/requirements.txt` | Modify | Add psycopg2-binary |
| `services/api/customer_api.py` | Modify | Update DB URI default, remove SQLite auto-migration |
| `services/db/schema.sql` | Modify | Convert to PostgreSQL syntax |
| `config.env.example` | Modify | PostgreSQL connection template |
| `services/db/import_from_excel.py` | Modify | Replace raw sqlite3 with SQLAlchemy |

---

### Task 1: Pre-Migration Backup

**Files:**
- Read: `services/customer.db`
- Read: API endpoint `/api/export`

- [ ] **Step 1: Back up the SQLite database file**

```bash
cp services/customer.db services/customer.db.bak
```

Expected: `services/customer.db.bak` exists as a copy.

- [ ] **Step 2: Export current data to XLSX**

Start the app and hit the export endpoint:

```bash
cd services && python -m api.customer_api &
sleep 3
curl -o services/pre_migration_export.xlsx http://127.0.0.1:5000/api/export
kill %1
```

Expected: `services/pre_migration_export.xlsx` is created with all current data.

- [ ] **Step 3: Verify the export**

Open the XLSX and confirm it has sheets for Clients, Employee Benefits, and Commercial Insurance with the expected row counts.

---

### Task 2: Install PostgreSQL and Create Database

- [ ] **Step 1: Install PostgreSQL 17 via Homebrew**

```bash
brew install postgresql@17
```

- [ ] **Step 2: Start the PostgreSQL service**

```bash
brew services start postgresql@17
```

- [ ] **Step 3: Create the application database**

```bash
createdb client_portal
```

Expected: No errors. Verify with `psql client_portal -c '\dt'` (should show empty table list).

- [ ] **Step 4: Commit — no code changes in this task**

This is an environment setup task only.

---

### Task 3: Add PostgreSQL Driver

**Files:**
- Modify: `services/requirements.txt`

- [ ] **Step 1: Add psycopg2-binary to requirements.txt**

Add this line to `services/requirements.txt`:

```
psycopg2-binary==2.9.10
```

The full file should be:

```
Flask==3.1.0
Flask-CORS==5.0.1
Flask-SQLAlchemy==3.1.1
SQLAlchemy==2.0.36
python-dateutil==2.9.0
openpyxl==3.1.5
psycopg2-binary==2.9.10
```

- [ ] **Step 2: Install the new dependency**

```bash
cd services && pip install -r requirements.txt
```

Expected: `psycopg2-binary` installs successfully.

- [ ] **Step 3: Commit**

```bash
git add services/requirements.txt
git commit -m "Add psycopg2-binary for PostgreSQL support"
```

---

### Task 4: Update Database Connection Configuration

**Files:**
- Modify: `services/api/customer_api.py:117-135`
- Modify: `config.env.example`

- [ ] **Step 1: Update the default DATABASE_URI in customer_api.py**

Replace lines 117-135 in `services/api/customer_api.py`:

```python
# ===========================================================================
# DATABASE CONFIGURATION
# ===========================================================================
db_uri = os.environ.get('DATABASE_URI', 'sqlite:///' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'customer.db'))

# Ensure database directory exists (SQLite can create the file but not the directory)
if db_uri.startswith('sqlite'):
    # Extract path from URI: sqlite:///path or sqlite:////path
    db_path = db_uri.split('sqlite:///')[1] if 'sqlite:///' in db_uri else None
    if db_path:
        db_dir = os.path.dirname(os.path.abspath(db_path))
        if not os.path.isdir(db_dir):
            logging.info(f"Creating database directory: {db_dir}")
            os.makedirs(db_dir, exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
db = SQLAlchemy(app)
Session = sessionmaker(bind=engine)
logging.info(f"Database URI: {db_uri}")
```

With:

```python
# ===========================================================================
# DATABASE CONFIGURATION
# ===========================================================================
db_uri = os.environ.get('DATABASE_URI', 'postgresql://localhost/client_portal')

app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
db = SQLAlchemy(app)
Session = sessionmaker(bind=engine)
logging.info(f"Database URI: {db_uri}")
```

- [ ] **Step 2: Update config.env.example**

Replace the entire file content of `config.env.example`:

```ini
# =============================================================================
# Client Portal Configuration
# =============================================================================
# Copy this file to config.env and adjust values for your environment.

# --- Database ---
# PostgreSQL connection string
# macOS dev:   postgresql://localhost/client_portal
# Windows:     postgresql://username:password@localhost:5432/client_portal
DATABASE_URI=postgresql://localhost/client_portal

# --- API Server ---
API_HOST=0.0.0.0
API_PORT=5000
API_DEBUG=false

# --- Network Security ---
# LAN_ONLY=true (default) blocks all requests from public/external IPs.
# Only local network IPs (127.x, 10.x, 172.16-31.x, 192.168.x) are allowed.
# Set to false to disable this restriction (NOT recommended for production).
LAN_ONLY=true

# Additional allowed IPs or CIDR ranges beyond private networks (comma-separated).
# Example: ALLOWED_IPS=203.0.113.5,198.51.100.0/24
ALLOWED_IPS=

# --- CORS ---
# Additional allowed origins (comma-separated).
# Origins from local network IPs are automatically allowed.
# Example: ALLOWED_ORIGINS=http://server-name:5000
ALLOWED_ORIGINS=

# --- Backup Scheduler ---
BACKUP_DIR=C:/ClientPortal/backups
BACKUP_API_URL=http://127.0.0.1:5000/api/export
BACKUP_MAX_COUNT=30
```

- [ ] **Step 3: Commit**

```bash
git add services/api/customer_api.py config.env.example
git commit -m "Switch default database URI from SQLite to PostgreSQL"
```

---

### Task 5: Remove SQLite Auto-Migration Code

**Files:**
- Modify: `services/api/customer_api.py:4273-4342`

- [ ] **Step 1: Replace the auto-migration block**

Replace lines 4273-4342 in `services/api/customer_api.py`:

```python
# Create tables and run migrations (runs on import so migrations apply regardless of entry point)
with app.app_context():
    db.create_all()

    # Auto-migrate: add missing columns to existing tables
    import sqlite3 as _sqlite3
    if db_uri.startswith('sqlite'):
        try:
            _db_path = db_uri.split('sqlite:///')[1].split('?')[0] if 'sqlite:///' in db_uri else None
            if _db_path:
                _conn = _sqlite3.connect(_db_path)
                _cursor = _conn.cursor()

                # Migrations per table: (table_name, column_name, column_type)
                _limit_products = [
                    'general_liability', 'property', 'bop', 'umbrella', 'workers_comp',
                    'professional_eo', 'cyber', 'auto', 'epli', 'nydbl', 'surety',
                    'product_liability', 'flood', 'crime', 'directors_officers',
                    'fiduciary', 'inland_marine'
                ]
                _single_benefit_types = [
                    'ltd', 'std', 'k401', 'critical_illness',
                    'accident', 'hospital', 'voluntary_life',
                ]
                _table_migrations = [
                    ('employee_benefits', 'enrolled_ees', 'INTEGER'),
                    ('employee_benefits', 'parent_client', 'VARCHAR(200)'),
                    ('commercial_insurance', 'parent_client', 'VARCHAR(200)'),
                    ('clients', 'gross_revenue', 'DECIMAL(15,2)'),
                    ('clients', 'total_ees', 'INTEGER'),
                ]
                for _bt in _single_benefit_types:
                    _table_migrations.append(('employee_benefits', f'{_bt}_flag', 'BOOLEAN DEFAULT 0'))
                    _table_migrations.append(('employee_benefits', f'{_bt}_remarks', 'TEXT'))
                    _table_migrations.append(('employee_benefits', f'{_bt}_outstanding_item', 'VARCHAR(50)'))
                # Split limit -> occ_limit + agg_limit for all commercial products
                for _prod in _limit_products:
                    _table_migrations.append(('commercial_insurance', f'{_prod}_occ_limit', 'VARCHAR(100)'))
                    _table_migrations.append(('commercial_insurance', f'{_prod}_agg_limit', 'VARCHAR(100)'))
                _table_migrations.append(('commercial_plans', 'coverage_occ_limit', 'VARCHAR(100)'))
                _table_migrations.append(('commercial_plans', 'coverage_agg_limit', 'VARCHAR(100)'))

                # Group by table
                _tables = {}
                for tbl, col, ctype in _table_migrations:
                    _tables.setdefault(tbl, []).append((col, ctype))

                for tbl, cols in _tables.items():
                    _cursor.execute(f"PRAGMA table_info({tbl})")
                    _existing_cols = {row[1] for row in _cursor.fetchall()}
                    for col_name, col_type in cols:
                        if col_name not in _existing_cols:
                            _cursor.execute(f"ALTER TABLE {tbl} ADD COLUMN {col_name} {col_type}")
                            logging.info(f"Migration: added column '{col_name}' to {tbl}")

                # Rename outstanding_item values
                _renames = [
                    ('Pending Premium', 'Premium Due'),
                    ('Pending Cancellation', 'Cancel Due'),
                ]
                for _old_val, _new_val in _renames:
                    for _tbl in ('employee_benefits', 'commercial_insurance'):
                        _cursor.execute(f"UPDATE {_tbl} SET outstanding_item = ? WHERE outstanding_item = ?", (_new_val, _old_val))
                        if _cursor.rowcount > 0:
                            logging.info(f"Migration: renamed '{_old_val}' to '{_new_val}' in {_tbl} ({_cursor.rowcount} rows)")

                _conn.commit()
                _conn.close()
        except Exception as e:
            logging.warning(f"Auto-migration check failed: {e}")
```

With:

```python
# Create tables (runs on import so schema applies regardless of entry point)
with app.app_context():
    db.create_all()
```

- [ ] **Step 2: Verify the app starts**

```bash
cd services && DATABASE_URI=postgresql://localhost/client_portal python -c "from api.customer_api import app; print('App loaded OK')"
```

Expected: `App loaded OK` with no errors.

- [ ] **Step 3: Verify tables were created in PostgreSQL**

```bash
psql client_portal -c '\dt'
```

Expected: All 7 tables listed (clients, client_contacts, employee_benefits, benefit_plans, commercial_insurance, commercial_plans, feedback), plus any others defined in SQLAlchemy models.

- [ ] **Step 4: Commit**

```bash
git add services/api/customer_api.py
git commit -m "Remove SQLite auto-migration code, keep only db.create_all()"
```

---

### Task 6: Convert schema.sql to PostgreSQL Syntax

**Files:**
- Modify: `services/db/schema.sql`

- [ ] **Step 1: Replace SQLite syntax with PostgreSQL equivalents**

In `services/db/schema.sql`, make these replacements across the entire file:

1. Replace all `INTEGER PRIMARY KEY AUTOINCREMENT` with `SERIAL PRIMARY KEY`
2. Replace all `BOOLEAN DEFAULT 0` with `BOOLEAN DEFAULT FALSE`

The `CREATE TABLE IF NOT EXISTS`, `VARCHAR`, `TEXT`, `DECIMAL`, `DATE`, `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`, `FOREIGN KEY ... ON DELETE CASCADE`, and `CREATE INDEX` statements are all already PostgreSQL-compatible.

Here is the complete updated `services/db/schema.sql`:

```sql
-- Client Portal Database Schema (PostgreSQL)
-- Seven tables: Clients, Client Contacts, Employee Benefits, Benefit Plans,
--               Commercial Insurance, Commercial Plans, Feedback

-- ============================================================================
-- CLIENTS TABLE (Master Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    tax_id VARCHAR(50) NOT NULL UNIQUE,
    client_name VARCHAR(200),
    contact_person VARCHAR(200),
    email VARCHAR(200),
    phone_number VARCHAR(50),
    address_line_1 VARCHAR(200),
    address_line_2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    status VARCHAR(50) DEFAULT 'Active',
    gross_revenue DECIMAL(15, 2),
    total_ees INTEGER,
    industry VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_tax_id ON clients(tax_id);

-- ============================================================================
-- CLIENT CONTACTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_contacts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    contact_person VARCHAR(200),
    email VARCHAR(200),
    phone_number VARCHAR(50),
    phone_extension VARCHAR(20),
    address_line_1 VARCHAR(200),
    address_line_2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX idx_client_contacts_client_id ON client_contacts(client_id);

-- ============================================================================
-- EMPLOYEE BENEFITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_benefits (
    id SERIAL PRIMARY KEY,
    tax_id VARCHAR(50) NOT NULL,

    -- Core fields
    form_fire_code VARCHAR(100),
    enrollment_poc VARCHAR(200),
    renewal_date DATE,
    funding VARCHAR(100),
    current_carrier VARCHAR(200),
    num_employees_at_renewal INTEGER,
    waiting_period VARCHAR(100),
    deductible_accumulation VARCHAR(100),
    previous_carrier VARCHAR(200),
    cobra_carrier VARCHAR(200),
    employee_contribution VARCHAR(50),

    -- Dental
    dental_renewal_date DATE,
    dental_carrier VARCHAR(200),

    -- Vision
    vision_renewal_date DATE,
    vision_carrier VARCHAR(200),

    -- Life & AD&D
    life_adnd_renewal_date DATE,
    life_adnd_carrier VARCHAR(200),

    -- LTD (Long-Term Disability)
    ltd_renewal_date DATE,
    ltd_carrier VARCHAR(200),

    -- STD (Short-Term Disability)
    std_renewal_date DATE,
    std_carrier VARCHAR(200),

    -- 401K
    k401_renewal_date DATE,
    k401_carrier VARCHAR(200),

    -- Critical Illness
    critical_illness_renewal_date DATE,
    critical_illness_carrier VARCHAR(200),

    -- Accident
    accident_renewal_date DATE,
    accident_carrier VARCHAR(200),

    -- Hospital
    hospital_renewal_date DATE,
    hospital_carrier VARCHAR(200),

    -- Voluntary Life
    voluntary_life_renewal_date DATE,
    voluntary_life_carrier VARCHAR(200),

    -- Flag columns for single-plan types
    ltd_flag BOOLEAN DEFAULT FALSE,
    std_flag BOOLEAN DEFAULT FALSE,
    k401_flag BOOLEAN DEFAULT FALSE,
    critical_illness_flag BOOLEAN DEFAULT FALSE,
    accident_flag BOOLEAN DEFAULT FALSE,
    hospital_flag BOOLEAN DEFAULT FALSE,
    voluntary_life_flag BOOLEAN DEFAULT FALSE,

    -- Remarks columns for single-plan types
    ltd_remarks TEXT,
    std_remarks TEXT,
    k401_remarks TEXT,
    critical_illness_remarks TEXT,
    accident_remarks TEXT,
    hospital_remarks TEXT,
    voluntary_life_remarks TEXT,

    -- Outstanding item columns for single-plan types
    ltd_outstanding_item VARCHAR(50),
    std_outstanding_item VARCHAR(50),
    k401_outstanding_item VARCHAR(50),
    critical_illness_outstanding_item VARCHAR(50),
    accident_outstanding_item VARCHAR(50),
    hospital_outstanding_item VARCHAR(50),
    voluntary_life_outstanding_item VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tax_id) REFERENCES clients(tax_id) ON DELETE CASCADE
);

CREATE INDEX idx_employee_benefits_tax_id ON employee_benefits(tax_id);
CREATE INDEX idx_employee_benefits_renewal_date ON employee_benefits(renewal_date);

-- ============================================================================
-- BENEFIT PLANS TABLE (Child of Employee Benefits - supports multiple plans)
-- Covers: Medical, Dental, Vision, Life & AD&D
-- ============================================================================
CREATE TABLE IF NOT EXISTS benefit_plans (
    id SERIAL PRIMARY KEY,
    employee_benefit_id INTEGER NOT NULL,
    plan_type VARCHAR(50) NOT NULL,   -- medical, dental, vision, life_adnd
    plan_number INTEGER NOT NULL DEFAULT 1,
    carrier VARCHAR(200),
    renewal_date DATE,
    flag BOOLEAN DEFAULT FALSE,
    waiting_period VARCHAR(100),

    FOREIGN KEY (employee_benefit_id) REFERENCES employee_benefits(id) ON DELETE CASCADE
);

CREATE INDEX idx_benefit_plans_employee_benefit_id ON benefit_plans(employee_benefit_id);
CREATE INDEX idx_benefit_plans_plan_type ON benefit_plans(plan_type);

-- ============================================================================
-- COMMERCIAL INSURANCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS commercial_insurance (
    id SERIAL PRIMARY KEY,
    tax_id VARCHAR(50) NOT NULL,

    -- Core fields
    remarks TEXT,
    status VARCHAR(50),
    outstanding_item VARCHAR(50),

    -- 1. Commercial General Liability
    general_liability_carrier VARCHAR(200),
    general_liability_limit VARCHAR(100),
    general_liability_premium DECIMAL(12, 2),
    general_liability_renewal_date DATE,

    -- 2. Commercial Property
    property_carrier VARCHAR(200),
    property_limit VARCHAR(100),
    property_premium DECIMAL(12, 2),
    property_renewal_date DATE,

    -- 3. Business Owners Policy (BOP)
    bop_carrier VARCHAR(200),
    bop_limit VARCHAR(100),
    bop_premium DECIMAL(12, 2),
    bop_renewal_date DATE,

    -- 4. Umbrella Liability
    umbrella_carrier VARCHAR(200),
    umbrella_limit VARCHAR(100),
    umbrella_premium DECIMAL(12, 2),
    umbrella_renewal_date DATE,

    -- 5. Workers Compensation
    workers_comp_carrier VARCHAR(200),
    workers_comp_limit VARCHAR(100),
    workers_comp_premium DECIMAL(12, 2),
    workers_comp_renewal_date DATE,

    -- 6. Professional or E&O
    professional_eo_carrier VARCHAR(200),
    professional_eo_limit VARCHAR(100),
    professional_eo_premium DECIMAL(12, 2),
    professional_eo_renewal_date DATE,

    -- 7. Cyber Liability
    cyber_carrier VARCHAR(200),
    cyber_limit VARCHAR(100),
    cyber_premium DECIMAL(12, 2),
    cyber_renewal_date DATE,

    -- 8. Commercial Auto
    auto_carrier VARCHAR(200),
    auto_limit VARCHAR(100),
    auto_premium DECIMAL(12, 2),
    auto_renewal_date DATE,

    -- 9. EPLI (Employment Practices Liability)
    epli_carrier VARCHAR(200),
    epli_limit VARCHAR(100),
    epli_premium DECIMAL(12, 2),
    epli_renewal_date DATE,

    -- 10. NYDBL (NY Disability Benefit Law)
    nydbl_carrier VARCHAR(200),
    nydbl_limit VARCHAR(100),
    nydbl_premium DECIMAL(12, 2),
    nydbl_renewal_date DATE,

    -- 11. Surety Bond
    surety_carrier VARCHAR(200),
    surety_limit VARCHAR(100),
    surety_premium DECIMAL(12, 2),
    surety_renewal_date DATE,

    -- 12. Product Liability
    product_liability_carrier VARCHAR(200),
    product_liability_limit VARCHAR(100),
    product_liability_premium DECIMAL(12, 2),
    product_liability_renewal_date DATE,

    -- 13. Flood
    flood_carrier VARCHAR(200),
    flood_limit VARCHAR(100),
    flood_premium DECIMAL(12, 2),
    flood_renewal_date DATE,

    -- 14. Crime or Fidelity Bond
    crime_carrier VARCHAR(200),
    crime_limit VARCHAR(100),
    crime_premium DECIMAL(12, 2),
    crime_renewal_date DATE,

    -- 15. Directors & Officers
    directors_officers_carrier VARCHAR(200),
    directors_officers_limit VARCHAR(100),
    directors_officers_premium DECIMAL(12, 2),
    directors_officers_renewal_date DATE,

    -- 16. Fiduciary Bond
    fiduciary_carrier VARCHAR(200),
    fiduciary_limit VARCHAR(100),
    fiduciary_premium DECIMAL(12, 2),
    fiduciary_renewal_date DATE,

    -- 17. Inland Marine
    inland_marine_carrier VARCHAR(200),
    inland_marine_limit VARCHAR(100),
    inland_marine_premium DECIMAL(12, 2),
    inland_marine_renewal_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tax_id) REFERENCES clients(tax_id) ON DELETE CASCADE
);

CREATE INDEX idx_commercial_insurance_tax_id ON commercial_insurance(tax_id);
CREATE INDEX idx_commercial_insurance_status ON commercial_insurance(status);

-- ============================================================================
-- COMMERCIAL PLANS TABLE (Child of Commercial Insurance - supports multiple plans)
-- Covers: Umbrella, Professional E&O, Cyber, Crime
-- ============================================================================
CREATE TABLE IF NOT EXISTS commercial_plans (
    id SERIAL PRIMARY KEY,
    commercial_insurance_id INTEGER NOT NULL,
    plan_type VARCHAR(50) NOT NULL,   -- umbrella, professional_eo, cyber, crime
    plan_number INTEGER NOT NULL DEFAULT 1,
    carrier VARCHAR(200),
    coverage_limit VARCHAR(100),
    premium DECIMAL(12, 2),
    renewal_date DATE,
    flag BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (commercial_insurance_id) REFERENCES commercial_insurance(id) ON DELETE CASCADE
);

CREATE INDEX idx_commercial_plans_commercial_insurance_id ON commercial_plans(commercial_insurance_id);
CREATE INDEX idx_commercial_plans_plan_type ON commercial_plans(plan_type);

-- ============================================================================
-- FEEDBACK TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'Bug',
    subject VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'New',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_status ON feedback(status);
```

- [ ] **Step 2: Commit**

```bash
git add services/db/schema.sql
git commit -m "Convert schema.sql from SQLite to PostgreSQL syntax"
```

---

### Task 7: Update Standalone Import Script

**Files:**
- Modify: `services/db/import_from_excel.py`

- [ ] **Step 1: Replace sqlite3 with SQLAlchemy**

Replace the imports and constants at the top of `services/db/import_from_excel.py` (lines 1-18):

```python
#!/usr/bin/env python3
"""
Excel Import Script for Client Portal Database
Reads Data Sheet.xlsx and populates the 3-table database structure
"""

import pandas as pd
import sqlite3
from datetime import datetime
from dateutil.parser import parse
import os
import sys

# Add parent directory to path to import from customer_api
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

DATABASE_PATH = os.path.join(os.path.dirname(__file__), '..', 'customer.db')
EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'webapp', 'customer-app', 'Data Sheet.xlsx')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')
```

With:

```python
#!/usr/bin/env python3
"""
Excel Import Script for Client Portal Database
Reads Data Sheet.xlsx and populates the 3-table database structure.
Uses SQLAlchemy to support both SQLite and PostgreSQL.
"""

import pandas as pd
from datetime import datetime
from dateutil.parser import parse
import os
import sys

from sqlalchemy import create_engine, text

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

DATABASE_URI = os.environ.get('DATABASE_URI', 'postgresql://localhost/client_portal')
EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'webapp', 'customer-app', 'Data Sheet.xlsx')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema.sql')
```

- [ ] **Step 2: Replace initialize_database function**

Replace the `initialize_database` function (lines 48-71):

```python
def initialize_database():
    """Create database from schema file."""
    print("Initializing database from schema...")

    # Read schema file
    with open(SCHEMA_PATH, 'r') as f:
        schema_sql = f.read()

    # Delete existing database if it exists
    if os.path.exists(DATABASE_PATH):
        backup_path = DATABASE_PATH + '.old'
        if os.path.exists(backup_path):
            os.remove(backup_path)
        os.rename(DATABASE_PATH, backup_path)
        print(f"Existing database backed up to {backup_path}")

    # Create new database with schema
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.executescript(schema_sql)
    conn.commit()
    conn.close()

    print("Database initialized successfully")
```

With:

```python
def initialize_database(engine):
    """Create database tables from schema file."""
    print("Initializing database from schema...")

    with open(SCHEMA_PATH, 'r') as f:
        schema_sql = f.read()

    with engine.connect() as conn:
        # Split by semicolons and execute each statement
        for statement in schema_sql.split(';'):
            statement = statement.strip()
            if statement:
                conn.execute(text(statement))
        conn.commit()

    print("Database initialized successfully")
```

- [ ] **Step 3: Replace import_clients to use SQLAlchemy**

Replace the `import_clients` function (lines 74-122):

```python
def import_clients(conn):
```

With:

```python
def import_clients(engine):
```

And replace all `sqlite3` cursor usage inside with SQLAlchemy. The key changes:
- `conn = sqlite3.connect(...)` → use the `engine` parameter
- `cursor.execute(sql, list(data.values()))` → `conn.execute(text(sql), data)` with named parameters
- `?` placeholders → `:param_name` named placeholders

Full replacement for `import_clients`:

```python
def import_clients(engine):
    """Import Clients sheet."""
    print("\n=== Importing Clients ===")

    df = pd.read_excel(EXCEL_PATH, sheet_name='Clients', header=1)
    print(f"Found {len(df)} client records")

    column_map = {
        'Tax ID': 'tax_id',
        'Client Name ': 'client_name',
        'Contact Person': 'contact_person',
        'Email': 'email',
        ' Phone Number': 'phone_number',
        'Address Line 1': 'address_line_1',
        'Address Line 2': 'address_line_2',
        'City': 'city',
        'State': 'state',
        'Zip Code': 'zip_code'
    }

    inserted = 0

    with engine.connect() as conn:
        for idx, row in df.iterrows():
            try:
                data = {}
                for excel_col, db_col in column_map.items():
                    if excel_col in row:
                        data[db_col] = clean_value(row[excel_col])

                columns = ', '.join(data.keys())
                placeholders = ', '.join([f':{k}' for k in data.keys()])
                sql = f"INSERT INTO clients ({columns}) VALUES ({placeholders})"

                conn.execute(text(sql), data)
                inserted += 1
                print(f"  Inserted client: {data.get('client_name', 'Unknown')} (Tax ID: {data.get('tax_id', 'N/A')})")

            except Exception as e:
                print(f"  Error inserting row {idx}: {e}")

        conn.commit()

    print(f"Imported {inserted}/{len(df)} clients successfully")
    return inserted
```

- [ ] **Step 4: Replace import_employee_benefits to use SQLAlchemy**

Same pattern — replace `def import_employee_benefits(conn):` signature with `def import_employee_benefits(engine):` and convert all sqlite3 cursor operations to SQLAlchemy text queries with named parameters.

Key changes inside the function:
- Wrap body in `with engine.connect() as conn:`
- `cursor.execute("SELECT id FROM clients WHERE tax_id = ?", (tax_id,))` → `conn.execute(text("SELECT id FROM clients WHERE tax_id = :tax_id"), {"tax_id": tax_id})`
- `?` placeholders → `:param_name`
- `cursor.fetchone()` → `.fetchone()`
- End with `conn.commit()`

```python
def import_employee_benefits(engine):
    """Import Employee Benefits sheet."""
    print("\n=== Importing Employee Benefits ===")

    df = pd.read_excel(EXCEL_PATH, sheet_name='Employee Benefits', header=1)
    print(f"Found {len(df)} employee benefit records")

    column_map = {
        'Tax ID': 'tax_id',
        'Form Fire Code': 'form_fire_code',
        'Enrollment POC': 'enrollment_poc',
        'Renewal Date': 'renewal_date',
        'Funding': 'funding',
        'Current Carrier': 'current_carrier',
        '# of Employees at Renewal': 'num_employees_at_renewal',
        'Waiting Period': 'waiting_period',
        'Deductible Accumulation': 'deductible_accumulation',
        'Previous Carrier': 'previous_carrier',
        'Cobra Administrator': 'cobra_carrier',
        'Employee Contribution': 'employee_contribution'
    }

    benefit_plans = [
        ('Dental', 'dental'),
        ('Vision', 'vision'),
        ('Life & AD&D', 'life_adnd'),
        ('LTD', 'ltd'),
        ('STD', 'std'),
        ('401K', 'k401'),
        ('Critical Illness', 'critical_illness'),
        ('Accident', 'accident'),
        ('Hospital', 'hospital'),
        ('Voluntary Life', 'voluntary_life')
    ]

    inserted = 0

    with engine.connect() as conn:
        for idx, row in df.iterrows():
            try:
                data = {}

                for excel_col, db_col in column_map.items():
                    if excel_col in row:
                        if db_col == 'renewal_date':
                            data[db_col] = parse_date(row[excel_col])
                        elif db_col == 'num_employees_at_renewal':
                            val = row[excel_col]
                            data[db_col] = int(val) if not pd.isna(val) and val != '' else None
                        else:
                            data[db_col] = clean_value(row[excel_col])

                for plan_name, plan_prefix in benefit_plans:
                    renewal_col = f"{plan_name} Renewal Date"
                    carrier_col = f"{plan_name} Carrier"

                    if renewal_col in row:
                        data[f"{plan_prefix}_renewal_date"] = parse_date(row[renewal_col])
                    if carrier_col in row:
                        data[f"{plan_prefix}_carrier"] = clean_value(row[carrier_col])

                tax_id = data.get('tax_id')
                if not tax_id:
                    print(f"  Row {idx}: Missing Tax ID")
                    continue

                result = conn.execute(text("SELECT id FROM clients WHERE tax_id = :tax_id"), {"tax_id": tax_id})
                if not result.fetchone():
                    print(f"  Row {idx}: Tax ID {tax_id} not found in clients table")
                    continue

                columns = ', '.join(data.keys())
                placeholders = ', '.join([f':{k}' for k in data.keys()])
                sql = f"INSERT INTO employee_benefits ({columns}) VALUES ({placeholders})"

                conn.execute(text(sql), data)
                inserted += 1
                print(f"  Inserted employee benefit for Tax ID: {tax_id}")

            except Exception as e:
                print(f"  Error inserting row {idx}: {e}")

        conn.commit()

    print(f"Imported {inserted}/{len(df)} employee benefit records successfully")
    return inserted
```

- [ ] **Step 5: Replace import_commercial_insurance to use SQLAlchemy**

Same pattern — replace `def import_commercial_insurance(conn):` with `def import_commercial_insurance(engine):` and convert all operations.

```python
def import_commercial_insurance(engine):
    """Import Commercial Insurance sheet."""
    print("\n=== Importing Commercial Insurance ===")

    df = pd.read_excel(EXCEL_PATH, sheet_name='Commercial', header=1)
    print(f"Found {len(df)} commercial insurance records")

    core_fields = {
        'Tax ID': 'tax_id',
        ' Remarks ': 'remarks',
        ' Status ': 'status'
    }

    products = [
        ('', 'general_liability'),
        ('.1', 'property'),
        ('.2', 'bop'),
        ('.3', 'umbrella'),
        ('.4', 'workers_comp'),
        ('.5', 'professional_eo'),
        ('.6', 'cyber'),
        ('.7', 'auto'),
        ('.8', 'epli'),
        ('.9', 'nydbl'),
        ('.10', 'surety'),
        ('.11', 'product_liability'),
        ('.12', 'flood'),
        ('.13', 'crime'),
        ('.14', 'directors_officers'),
        ('.15', 'fiduciary'),
        ('.16', 'inland_marine')
    ]

    inserted = 0

    with engine.connect() as conn:
        for idx, row in df.iterrows():
            try:
                data = {}

                for excel_col, db_col in core_fields.items():
                    if excel_col in row:
                        data[db_col] = clean_value(row[excel_col])

                for col_suffix, product_prefix in products:
                    carrier_col = f"Carrier{col_suffix}"
                    agency_col = f"Agency{col_suffix}"
                    limit_col = f"Limit{col_suffix}"
                    premium_col = f"Premium{col_suffix}"
                    renewal_col = f"Renewal Date{col_suffix}"

                    if carrier_col in row:
                        data[f"{product_prefix}_carrier"] = clean_value(row[carrier_col])
                    if agency_col in row:
                        data[f"{product_prefix}_agency"] = clean_value(row[agency_col])
                    if limit_col in row:
                        data[f"{product_prefix}_limit"] = clean_value(row[limit_col])
                    if premium_col in row:
                        val = row[premium_col]
                        if not pd.isna(val) and val != '':
                            try:
                                val_str = str(val).replace('$', '').replace(',', '').strip()
                                data[f"{product_prefix}_premium"] = float(val_str) if val_str else None
                            except:
                                data[f"{product_prefix}_premium"] = None
                        else:
                            data[f"{product_prefix}_premium"] = None
                    if renewal_col in row:
                        data[f"{product_prefix}_renewal_date"] = parse_date(row[renewal_col])

                tax_id = data.get('tax_id')
                if not tax_id:
                    print(f"  Row {idx}: Missing Tax ID")
                    continue

                result = conn.execute(text("SELECT id FROM clients WHERE tax_id = :tax_id"), {"tax_id": tax_id})
                if not result.fetchone():
                    print(f"  Row {idx}: Tax ID {tax_id} not found in clients table")
                    continue

                columns = ', '.join(data.keys())
                placeholders = ', '.join([f':{k}' for k in data.keys()])
                sql = f"INSERT INTO commercial_insurance ({columns}) VALUES ({placeholders})"

                conn.execute(text(sql), data)
                inserted += 1
                print(f"  Inserted commercial insurance for Tax ID: {tax_id}")

            except Exception as e:
                print(f"  Error inserting row {idx}: {e}")

        conn.commit()

    print(f"Imported {inserted}/{len(df)} commercial insurance records successfully")
    return inserted
```

- [ ] **Step 6: Replace print_summary and main to use SQLAlchemy**

Replace `print_summary`:

```python
def print_summary(engine):
    """Print summary of imported data."""
    print("\n" + "="*50)
    print("IMPORT SUMMARY")
    print("="*50)

    with engine.connect() as conn:
        client_count = conn.execute(text("SELECT COUNT(*) FROM clients")).scalar()
        print(f"Total Clients: {client_count}")

        benefits_count = conn.execute(text("SELECT COUNT(*) FROM employee_benefits")).scalar()
        print(f"Total Employee Benefits: {benefits_count}")

        commercial_count = conn.execute(text("SELECT COUNT(*) FROM commercial_insurance")).scalar()
        print(f"Total Commercial Insurance: {commercial_count}")

        no_benefits = conn.execute(text("""
            SELECT COUNT(*) FROM clients c
            LEFT JOIN employee_benefits eb ON c.tax_id = eb.tax_id
            WHERE eb.id IS NULL
        """)).scalar()

        no_commercial = conn.execute(text("""
            SELECT COUNT(*) FROM clients c
            LEFT JOIN commercial_insurance ci ON c.tax_id = ci.tax_id
            WHERE ci.id IS NULL
        """)).scalar()

        print(f"\nCross-sell Opportunities:")
        print(f"  - Clients without Employee Benefits: {no_benefits}")
        print(f"  - Clients without Commercial Insurance: {no_commercial}")

    print("="*50)
```

Replace `main`:

```python
def main():
    """Main import process."""
    print("="*50)
    print("CLIENT PORTAL DATABASE IMPORT")
    print("="*50)

    if not os.path.exists(EXCEL_PATH):
        print(f"Error: Excel file not found at {EXCEL_PATH}")
        return

    if not os.path.exists(SCHEMA_PATH):
        print(f"Error: Schema file not found at {SCHEMA_PATH}")
        return

    print(f"Excel file: {EXCEL_PATH}")
    print(f"Database URI: {DATABASE_URI}")
    print(f"Schema file: {SCHEMA_PATH}")

    engine = create_engine(DATABASE_URI)

    # Initialize database
    initialize_database(engine)

    try:
        import_clients(engine)
        import_employee_benefits(engine)
        import_commercial_insurance(engine)
        print_summary(engine)
        print("\n Import completed successfully!")

    except Exception as e:
        print(f"\n Import failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
```

- [ ] **Step 7: Commit**

```bash
git add services/db/import_from_excel.py
git commit -m "Convert import_from_excel.py from sqlite3 to SQLAlchemy"
```

---

### Task 8: Post-Migration Data Reload and Verification

- [ ] **Step 1: Start the app with PostgreSQL**

```bash
cd services && DATABASE_URI=postgresql://localhost/client_portal python -m api.customer_api
```

Expected: App starts, `db.create_all()` creates all tables in PostgreSQL, no errors.

- [ ] **Step 2: Import data from the pre-migration XLSX**

Use the `/api/import` endpoint to upload `services/pre_migration_export.xlsx`:

```bash
curl -X POST -F "file=@services/pre_migration_export.xlsx" http://127.0.0.1:5000/api/import
```

Expected: JSON response with import stats (clients_created, benefits_created, commercial_created counts).

- [ ] **Step 3: Verify data in PostgreSQL**

```bash
psql client_portal -c "SELECT COUNT(*) FROM clients;"
psql client_portal -c "SELECT COUNT(*) FROM employee_benefits;"
psql client_portal -c "SELECT COUNT(*) FROM commercial_insurance;"
```

Expected: Row counts match what was in the SQLite database.

- [ ] **Step 4: Verify the app UI**

Open `http://localhost:5000` in a browser and spot-check:
- Client list loads
- Client details (contacts, benefits, commercial) display correctly
- Export still works (download XLSX)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "Complete SQLite to PostgreSQL 17.9 migration"
```
