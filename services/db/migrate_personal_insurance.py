"""
Migration script to create the personal_insurance table.
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

    # Check if table already exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='personal_insurance'")
    if cursor.fetchone():
        print("  personal_insurance table already exists, skipping")
        conn.close()
        return True

    cursor.execute('''
        CREATE TABLE personal_insurance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tax_id VARCHAR(50) NOT NULL REFERENCES clients(tax_id),
            parent_client VARCHAR(200),

            -- Personal Auto
            personal_auto_carrier VARCHAR(200),
            personal_auto_bi_occ_limit VARCHAR(100),
            personal_auto_bi_agg_limit VARCHAR(100),
            personal_auto_pd_limit VARCHAR(100),
            personal_auto_renewal_date DATE,
            personal_auto_premium DECIMAL(12, 2),
            personal_auto_outstanding_item VARCHAR(50),
            personal_auto_remarks TEXT,

            -- Homeowners
            homeowners_carrier VARCHAR(200),
            homeowners_dwelling_limit VARCHAR(100),
            homeowners_liability_limit VARCHAR(100),
            homeowners_renewal_date DATE,
            homeowners_premium DECIMAL(12, 2),
            homeowners_outstanding_item VARCHAR(50),
            homeowners_remarks TEXT,

            -- Personal Umbrella
            personal_umbrella_carrier VARCHAR(200),
            personal_umbrella_liability_limit VARCHAR(100),
            personal_umbrella_deductible DECIMAL(12, 2),
            personal_umbrella_renewal_date DATE,
            personal_umbrella_premium DECIMAL(12, 2),
            personal_umbrella_outstanding_item VARCHAR(50),
            personal_umbrella_remarks TEXT,

            -- Event Insurance
            event_carrier VARCHAR(200),
            event_type VARCHAR(200),
            event_location VARCHAR(500),
            event_start_date DATE,
            event_end_date DATE,
            event_entry_fee DECIMAL(12, 2),
            event_audience_count INTEGER,
            event_premium DECIMAL(12, 2),
            event_outstanding_item VARCHAR(50),
            event_remarks TEXT,

            -- Visitors Medical
            visitors_medical_carrier VARCHAR(200),
            visitors_medical_start_date DATE,
            visitors_medical_end_date DATE,
            visitors_medical_destination_country VARCHAR(200),
            visitors_medical_premium DECIMAL(12, 2),
            visitors_medical_outstanding_item VARCHAR(50),
            visitors_medical_remarks TEXT,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    print("  Created personal_insurance table")

    conn.commit()
    conn.close()

    print("\nMigration complete!")
    return True

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    services_dir = os.path.dirname(base_dir)

    db_files = [
        os.path.join(services_dir, "customer.db"),
        os.path.join(base_dir, "clients.db"),
    ]

    print("=" * 60)
    print("Personal Insurance Table Migration")
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
