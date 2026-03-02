"""
Migration: Add remarks columns to coverage tables and remove flag/status usage.

Adds:
- benefit_plans.remarks TEXT
- employee_benefits.{prefix}_remarks TEXT for 7 single-plan types
- commercial_plans.remarks TEXT
- commercial_insurance.{prefix}_remarks TEXT for 13 single-plan types

Run: python migrate_coverage_remarks.py
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

    # benefit_plans: add remarks
    if table_exists(cursor, 'benefit_plans'):
        if not column_exists(cursor, 'benefit_plans', 'remarks'):
            cursor.execute("ALTER TABLE benefit_plans ADD COLUMN remarks TEXT")
            print("Added remarks to benefit_plans")
    else:
        print("Skipping benefit_plans (table does not exist yet — will be created by API)")

    # employee_benefits: add per-coverage remarks for single-plan types
    benefit_single_prefixes = [
        'ltd', 'std', 'k401', 'critical_illness',
        'accident', 'hospital', 'voluntary_life'
    ]
    if table_exists(cursor, 'employee_benefits'):
        for prefix in benefit_single_prefixes:
            col = f'{prefix}_remarks'
            if not column_exists(cursor, 'employee_benefits', col):
                cursor.execute(f"ALTER TABLE employee_benefits ADD COLUMN {col} TEXT")
                print(f"Added {col} to employee_benefits")
    else:
        print("Skipping employee_benefits (table does not exist yet — will be created by API)")

    # commercial_plans: add remarks
    if table_exists(cursor, 'commercial_plans'):
        if not column_exists(cursor, 'commercial_plans', 'remarks'):
            cursor.execute("ALTER TABLE commercial_plans ADD COLUMN remarks TEXT")
            print("Added remarks to commercial_plans")
    else:
        print("Skipping commercial_plans (table does not exist yet — will be created by API)")

    # commercial_insurance: add per-coverage remarks for single-plan types
    commercial_single_prefixes = [
        'general_liability', 'property', 'bop', 'workers_comp', 'auto',
        'epli', 'nydbl', 'surety', 'product_liability', 'flood',
        'directors_officers', 'fiduciary', 'inland_marine'
    ]
    if table_exists(cursor, 'commercial_insurance'):
        for prefix in commercial_single_prefixes:
            col = f'{prefix}_remarks'
            if not column_exists(cursor, 'commercial_insurance', col):
                cursor.execute(f"ALTER TABLE commercial_insurance ADD COLUMN {col} TEXT")
                print(f"Added {col} to commercial_insurance")
    else:
        print("Skipping commercial_insurance (table does not exist yet — will be created by API)")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == '__main__':
    migrate()
