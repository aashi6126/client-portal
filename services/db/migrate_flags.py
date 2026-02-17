"""
Migration script: Add flag columns to benefit_plans, employee_benefits,
commercial_insurance, and commercial_plans tables.

Run this ONCE after adding the flag feature.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'customer.db')


def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    changes = 0

    # Add flag to benefit_plans
    if not column_exists(cursor, 'benefit_plans', 'flag'):
        cursor.execute('ALTER TABLE benefit_plans ADD COLUMN flag BOOLEAN DEFAULT 0')
        print("  Added flag to benefit_plans")
        changes += 1

    # Add flag columns to employee_benefits (single-plan types)
    benefit_flag_cols = [
        'ltd_flag', 'std_flag', 'k401_flag', 'critical_illness_flag',
        'accident_flag', 'hospital_flag', 'voluntary_life_flag'
    ]
    for col in benefit_flag_cols:
        if not column_exists(cursor, 'employee_benefits', col):
            cursor.execute(f'ALTER TABLE employee_benefits ADD COLUMN {col} BOOLEAN DEFAULT 0')
            print(f"  Added {col} to employee_benefits")
            changes += 1

    # Add flag columns to commercial_insurance (single-plan types)
    commercial_flag_cols = [
        'general_liability_flag', 'property_flag', 'bop_flag',
        'workers_comp_flag', 'auto_flag', 'epli_flag', 'nydbl_flag',
        'surety_flag', 'product_liability_flag', 'flood_flag',
        'directors_officers_flag', 'fiduciary_flag', 'inland_marine_flag'
    ]
    for col in commercial_flag_cols:
        if not column_exists(cursor, 'commercial_insurance', col):
            cursor.execute(f'ALTER TABLE commercial_insurance ADD COLUMN {col} BOOLEAN DEFAULT 0')
            print(f"  Added {col} to commercial_insurance")
            changes += 1

    conn.commit()
    print(f"\nFlag migration complete: {changes} columns added")
    conn.close()


if __name__ == '__main__':
    migrate()
