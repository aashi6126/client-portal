"""
Migration script to create the individuals and personal_insurance tables.
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

    # Create individuals table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='individuals'")
    if cursor.fetchone():
        print("  individuals table already exists, skipping")
    else:
        cursor.execute('''
            CREATE TABLE individuals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                individual_id VARCHAR(50) UNIQUE NOT NULL,
                first_name VARCHAR(200),
                last_name VARCHAR(200),
                email VARCHAR(200),
                phone_number VARCHAR(50),

                address_line_1 VARCHAR(200),
                address_line_2 VARCHAR(200),
                city VARCHAR(100),
                state VARCHAR(50),
                zip_code VARCHAR(20),
                status VARCHAR(50) DEFAULT 'Active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("  Created individuals table")

    # Create or upgrade personal_insurance table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='personal_insurance'")
    if cursor.fetchone():
        # Check if it has the new individual_id column
        cursor.execute("PRAGMA table_info(personal_insurance)")
        cols = {row[1] for row in cursor.fetchall()}
        if 'individual_id' in cols:
            print("  personal_insurance table already up to date, skipping")
            conn.commit()
            conn.close()
            return True
        else:
            # Old schema with tax_id — check if empty, then recreate
            cursor.execute("SELECT COUNT(*) FROM personal_insurance")
            count = cursor.fetchone()[0]
            if count == 0:
                cursor.execute("DROP TABLE personal_insurance")
                print("  Dropped old personal_insurance table (empty, had tax_id schema)")
            else:
                print(f"  WARNING: personal_insurance has {count} rows with old tax_id schema.")
                print("  Adding individual_id column. You may need to manually migrate data.")
                cursor.execute("ALTER TABLE personal_insurance ADD COLUMN individual_id VARCHAR(50) REFERENCES individuals(individual_id)")
                conn.commit()
                conn.close()
                return True

    cursor.execute('''
        CREATE TABLE personal_insurance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            individual_id VARCHAR(50) NOT NULL REFERENCES individuals(individual_id),

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
    print("Individuals & Personal Insurance Table Migration")
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
