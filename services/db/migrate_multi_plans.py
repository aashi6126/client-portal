"""
Migration script: Copy existing flat carrier/renewal_date columns
into the new benefit_plans child table for Medical, Dental, Vision, Life & AD&D.

Run this ONCE after creating the benefit_plans table.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'customer.db')


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create benefit_plans table if it doesn't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS benefit_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_benefit_id INTEGER NOT NULL,
            plan_type VARCHAR(50) NOT NULL,
            plan_number INTEGER NOT NULL DEFAULT 1,
            carrier VARCHAR(200),
            renewal_date DATE,
            FOREIGN KEY (employee_benefit_id) REFERENCES employee_benefits(id) ON DELETE CASCADE
        )
    ''')

    # Check if migration already ran (any rows in benefit_plans?)
    cursor.execute('SELECT COUNT(*) FROM benefit_plans')
    existing_count = cursor.fetchone()[0]
    if existing_count > 0:
        print(f"benefit_plans already has {existing_count} rows. Skipping migration.")
        conn.close()
        return

    # Migrate Medical: current_carrier + renewal_date -> benefit_plans (medical, plan 1)
    cursor.execute('''
        INSERT INTO benefit_plans (employee_benefit_id, plan_type, plan_number, carrier, renewal_date)
        SELECT id, 'medical', 1, current_carrier, renewal_date
        FROM employee_benefits
        WHERE current_carrier IS NOT NULL OR renewal_date IS NOT NULL
    ''')
    medical_count = cursor.rowcount

    # Migrate Dental
    cursor.execute('''
        INSERT INTO benefit_plans (employee_benefit_id, plan_type, plan_number, carrier, renewal_date)
        SELECT id, 'dental', 1, dental_carrier, dental_renewal_date
        FROM employee_benefits
        WHERE dental_carrier IS NOT NULL OR dental_renewal_date IS NOT NULL
    ''')
    dental_count = cursor.rowcount

    # Migrate Vision
    cursor.execute('''
        INSERT INTO benefit_plans (employee_benefit_id, plan_type, plan_number, carrier, renewal_date)
        SELECT id, 'vision', 1, vision_carrier, vision_renewal_date
        FROM employee_benefits
        WHERE vision_carrier IS NOT NULL OR vision_renewal_date IS NOT NULL
    ''')
    vision_count = cursor.rowcount

    # Migrate Life & AD&D
    cursor.execute('''
        INSERT INTO benefit_plans (employee_benefit_id, plan_type, plan_number, carrier, renewal_date)
        SELECT id, 'life_adnd', 1, life_adnd_carrier, life_adnd_renewal_date
        FROM employee_benefits
        WHERE life_adnd_carrier IS NOT NULL OR life_adnd_renewal_date IS NOT NULL
    ''')
    life_count = cursor.rowcount

    conn.commit()

    print(f"Migration complete:")
    print(f"  Medical plans migrated: {medical_count}")
    print(f"  Dental plans migrated: {dental_count}")
    print(f"  Vision plans migrated: {vision_count}")
    print(f"  Life & AD&D plans migrated: {life_count}")
    print(f"  Total: {medical_count + dental_count + vision_count + life_count}")

    conn.close()


if __name__ == '__main__':
    migrate()
