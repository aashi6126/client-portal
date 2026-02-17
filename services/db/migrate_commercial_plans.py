"""
Migration script: Copy existing flat carrier/limit/premium/renewal_date columns
into the new commercial_plans child table for Umbrella, Professional E&O, Cyber, Crime.

Run this ONCE after creating the commercial_plans table.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'customer.db')


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create commercial_plans table if it doesn't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS commercial_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            commercial_insurance_id INTEGER NOT NULL,
            plan_type VARCHAR(50) NOT NULL,
            plan_number INTEGER NOT NULL DEFAULT 1,
            carrier VARCHAR(200),
            coverage_limit VARCHAR(100),
            premium DECIMAL(12, 2),
            renewal_date DATE,
            flag BOOLEAN DEFAULT 0,
            FOREIGN KEY (commercial_insurance_id) REFERENCES commercial_insurance(id) ON DELETE CASCADE
        )
    ''')

    # Check if migration already ran
    cursor.execute('SELECT COUNT(*) FROM commercial_plans')
    existing_count = cursor.fetchone()[0]
    if existing_count > 0:
        print(f"commercial_plans already has {existing_count} rows. Skipping migration.")
        conn.close()
        return

    # Migrate Umbrella
    cursor.execute('''
        INSERT INTO commercial_plans (commercial_insurance_id, plan_type, plan_number, carrier, coverage_limit, premium, renewal_date)
        SELECT id, 'umbrella', 1, umbrella_carrier, umbrella_limit, umbrella_premium, umbrella_renewal_date
        FROM commercial_insurance
        WHERE umbrella_carrier IS NOT NULL OR umbrella_renewal_date IS NOT NULL
            OR umbrella_limit IS NOT NULL OR umbrella_premium IS NOT NULL
    ''')
    umbrella_count = cursor.rowcount

    # Migrate Professional E&O
    cursor.execute('''
        INSERT INTO commercial_plans (commercial_insurance_id, plan_type, plan_number, carrier, coverage_limit, premium, renewal_date)
        SELECT id, 'professional_eo', 1, professional_eo_carrier, professional_eo_limit, professional_eo_premium, professional_eo_renewal_date
        FROM commercial_insurance
        WHERE professional_eo_carrier IS NOT NULL OR professional_eo_renewal_date IS NOT NULL
            OR professional_eo_limit IS NOT NULL OR professional_eo_premium IS NOT NULL
    ''')
    eo_count = cursor.rowcount

    # Migrate Cyber
    cursor.execute('''
        INSERT INTO commercial_plans (commercial_insurance_id, plan_type, plan_number, carrier, coverage_limit, premium, renewal_date)
        SELECT id, 'cyber', 1, cyber_carrier, cyber_limit, cyber_premium, cyber_renewal_date
        FROM commercial_insurance
        WHERE cyber_carrier IS NOT NULL OR cyber_renewal_date IS NOT NULL
            OR cyber_limit IS NOT NULL OR cyber_premium IS NOT NULL
    ''')
    cyber_count = cursor.rowcount

    # Migrate Crime
    cursor.execute('''
        INSERT INTO commercial_plans (commercial_insurance_id, plan_type, plan_number, carrier, coverage_limit, premium, renewal_date)
        SELECT id, 'crime', 1, crime_carrier, crime_limit, crime_premium, crime_renewal_date
        FROM commercial_insurance
        WHERE crime_carrier IS NOT NULL OR crime_renewal_date IS NOT NULL
            OR crime_limit IS NOT NULL OR crime_premium IS NOT NULL
    ''')
    crime_count = cursor.rowcount

    conn.commit()

    print(f"Migration complete:")
    print(f"  Umbrella plans migrated: {umbrella_count}")
    print(f"  Professional E&O plans migrated: {eo_count}")
    print(f"  Cyber plans migrated: {cyber_count}")
    print(f"  Crime plans migrated: {crime_count}")
    print(f"  Total: {umbrella_count + eo_count + cyber_count + crime_count}")

    conn.close()


if __name__ == '__main__':
    migrate()
