"""
Migration script to add agency columns to commercial_insurance and commercial_plans tables.
"""

import sqlite3
import os

def migrate_database(db_path):
    print(f"Migrating database: {db_path}")

    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return False

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # ========== commercial_insurance: add {product}_agency columns ==========
    products = [
        'general_liability', 'property', 'bop', 'umbrella', 'workers_comp',
        'professional_eo', 'cyber', 'auto', 'epli', 'nydbl', 'surety',
        'product_liability', 'flood', 'crime', 'directors_officers',
        'fiduciary', 'inland_marine'
    ]

    cursor.execute("PRAGMA table_info(commercial_insurance)")
    existing_cols = {row[1] for row in cursor.fetchall()}

    added_count = 0
    for product in products:
        col = f'{product}_agency'
        if col not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE commercial_insurance ADD COLUMN {col} VARCHAR(200)")
                print(f"  Added {col} to commercial_insurance")
                added_count += 1
            except sqlite3.OperationalError as e:
                print(f"  Error adding {col}: {e}")
        else:
            print(f"  {col} already exists, skipping")

    # ========== commercial_plans: add agency column ==========
    cursor.execute("PRAGMA table_info(commercial_plans)")
    plan_cols = {row[1] for row in cursor.fetchall()}

    if 'agency' not in plan_cols:
        try:
            cursor.execute("ALTER TABLE commercial_plans ADD COLUMN agency VARCHAR(200)")
            print("  Added agency to commercial_plans")
            added_count += 1
        except sqlite3.OperationalError as e:
            print(f"  Error adding agency to commercial_plans: {e}")
    else:
        print("  agency already exists in commercial_plans, skipping")

    conn.commit()
    conn.close()

    print(f"\nMigration complete! Added {added_count} columns.")
    return True

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    services_dir = os.path.dirname(base_dir)

    db_files = [
        os.path.join(services_dir, "customer.db"),
        os.path.join(base_dir, "clients.db"),
    ]

    print("=" * 60)
    print("Commercial Insurance Agency Column Migration")
    print("=" * 60)
    print()

    migrated = False
    for db_file in db_files:
        if os.path.exists(db_file):
            migrate_database(db_file)
            migrated = True
            print()

    if not migrated:
        print("No database files found!")
        print("Expected locations:")
        for db_file in db_files:
            print(f"  - {db_file}")
