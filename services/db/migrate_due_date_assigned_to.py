"""
Migration: Add due_date fields alongside outstanding_item fields,
add assigned_to field to commercial_insurance,
change outstanding_item columns from String(50) to Text.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'customer.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get existing columns for each table
    def get_columns(table):
        cursor.execute(f"PRAGMA table_info({table})")
        return {row[1] for row in cursor.fetchall()}

    # --- Employee Benefits ---
    eb_cols = get_columns('employee_benefits')

    # Add assigned_to (replaces enrollment_poc conceptually, but keep column for backward compat)
    # We'll just rename in the UI, keep the DB column as enrollment_poc

    # Add due_date fields for benefits outstanding items
    eb_due_dates = [
        'outstanding_item_due_date',
        'ltd_outstanding_item_due_date',
        'std_outstanding_item_due_date',
        'k401_outstanding_item_due_date',
        'critical_illness_outstanding_item_due_date',
        'accident_outstanding_item_due_date',
        'hospital_outstanding_item_due_date',
        'voluntary_life_outstanding_item_due_date',
    ]
    for col in eb_due_dates:
        if col not in eb_cols:
            cursor.execute(f"ALTER TABLE employee_benefits ADD COLUMN {col} DATE")
            print(f"  Added employee_benefits.{col}")

    # --- Commercial Insurance ---
    ci_cols = get_columns('commercial_insurance')

    # Add assigned_to field
    if 'assigned_to' not in ci_cols:
        cursor.execute("ALTER TABLE commercial_insurance ADD COLUMN assigned_to VARCHAR(200)")
        print("  Added commercial_insurance.assigned_to")

    # Add due_date fields for commercial outstanding items
    ci_prefixes = [
        'general_liability', 'property', 'bop', 'workers_comp', 'auto',
        'epli', 'nydbl', 'surety', 'product_liability', 'flood',
        'directors_officers', 'fiduciary', 'inland_marine',
    ]
    for prefix in ci_prefixes:
        col = f'{prefix}_outstanding_item_due_date'
        if col not in ci_cols:
            cursor.execute(f"ALTER TABLE commercial_insurance ADD COLUMN {col} DATE")
            print(f"  Added commercial_insurance.{col}")

    # --- Commercial Plans (multi-plan types) ---
    cp_cols = get_columns('commercial_plans')
    if 'outstanding_item_due_date' not in cp_cols:
        cursor.execute("ALTER TABLE commercial_plans ADD COLUMN outstanding_item_due_date DATE")
        print("  Added commercial_plans.outstanding_item_due_date")

    # --- Benefit Plans ---
    bp_cols = get_columns('benefit_plans')
    if 'outstanding_item_due_date' not in bp_cols:
        cursor.execute("ALTER TABLE benefit_plans ADD COLUMN outstanding_item_due_date DATE")
        print("  Added benefit_plans.outstanding_item_due_date")

    # --- Personal Insurance ---
    pi_cols = get_columns('personal_insurance')
    pi_prefixes = ['personal_auto', 'homeowners', 'personal_umbrella', 'event', 'visitors_medical']
    for prefix in pi_prefixes:
        col = f'{prefix}_outstanding_item_due_date'
        if col not in pi_cols:
            cursor.execute(f"ALTER TABLE personal_insurance ADD COLUMN {col} DATE")
            print(f"  Added personal_insurance.{col}")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == '__main__':
    migrate()
