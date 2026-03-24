"""
Migration: Add policy_number columns to commercial insurance tables.

Adds:
- commercial_plans.policy_number VARCHAR(100)
- commercial_insurance.{prefix}_policy_number VARCHAR(100) for all 17 coverage types

Run: python migrate_policy_number.py
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

    # commercial_plans: add policy_number
    if table_exists(cursor, 'commercial_plans'):
        if not column_exists(cursor, 'commercial_plans', 'policy_number'):
            cursor.execute("ALTER TABLE commercial_plans ADD COLUMN policy_number VARCHAR(100)")
            print("Added policy_number to commercial_plans")
        else:
            print("commercial_plans.policy_number already exists")
    else:
        print("Skipping commercial_plans (table does not exist yet — will be created by API)")

    # commercial_insurance: add policy_number for all coverage types
    prefixes = [
        'general_liability', 'property', 'bop', 'umbrella', 'workers_comp',
        'professional_eo', 'cyber', 'auto', 'epli', 'nydbl', 'surety',
        'product_liability', 'flood', 'crime', 'directors_officers',
        'fiduciary', 'inland_marine'
    ]

    if table_exists(cursor, 'commercial_insurance'):
        for prefix in prefixes:
            col = f'{prefix}_policy_number'
            if not column_exists(cursor, 'commercial_insurance', col):
                cursor.execute(f"ALTER TABLE commercial_insurance ADD COLUMN {col} VARCHAR(100)")
                print(f"Added {col} to commercial_insurance")
            else:
                print(f"commercial_insurance.{col} already exists")
    else:
        print("Skipping commercial_insurance (table does not exist yet — will be created by API)")

    conn.commit()
    conn.close()
    print("\nMigration complete.")


if __name__ == '__main__':
    migrate()
