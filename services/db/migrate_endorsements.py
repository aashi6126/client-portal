"""
Migration: Add endorsement columns to commercial insurance tables.

Adds:
- commercial_insurance: general_liability_endorsement_{bop,marine,foreign,molestation,staffing} BOOLEAN
- commercial_plans: endorsement_{tech_eo,allied_healthcare,staffing} BOOLEAN

Run: python migrate_endorsements.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'customer.db')


def table_exists(cursor, table):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # GL endorsements on commercial_insurance
    gl_endorsements = [
        'general_liability_endorsement_bop',
        'general_liability_endorsement_marine',
        'general_liability_endorsement_foreign',
        'general_liability_endorsement_molestation',
        'general_liability_endorsement_staffing'
    ]

    if table_exists(cursor, 'commercial_insurance'):
        for col in gl_endorsements:
            if not column_exists(cursor, 'commercial_insurance', col):
                cursor.execute(f"ALTER TABLE commercial_insurance ADD COLUMN {col} BOOLEAN DEFAULT 0")
                print(f"Added {col} to commercial_insurance")
            else:
                print(f"commercial_insurance.{col} already exists")
    else:
        print("Skipping commercial_insurance (table does not exist yet)")

    # E&O endorsements on commercial_plans
    eo_endorsements = [
        'endorsement_tech_eo',
        'endorsement_allied_healthcare',
        'endorsement_staffing'
    ]

    if table_exists(cursor, 'commercial_plans'):
        for col in eo_endorsements:
            if not column_exists(cursor, 'commercial_plans', col):
                cursor.execute(f"ALTER TABLE commercial_plans ADD COLUMN {col} BOOLEAN DEFAULT 0")
                print(f"Added {col} to commercial_plans")
            else:
                print(f"commercial_plans.{col} already exists")
    else:
        print("Skipping commercial_plans (table does not exist yet)")

    conn.commit()
    conn.close()
    print("\nMigration complete.")


if __name__ == '__main__':
    migrate()
