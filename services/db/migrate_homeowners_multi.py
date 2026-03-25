"""
Migration: Create homeowners_policies table for multi-policy homeowners
with property address and primary/rental designation.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'customer.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if table already exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='homeowners_policies'")
    if cursor.fetchone():
        print("homeowners_policies table already exists")
        conn.close()
        return

    cursor.execute("""
        CREATE TABLE homeowners_policies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            personal_insurance_id INTEGER NOT NULL,
            policy_number INTEGER NOT NULL DEFAULT 1,
            carrier VARCHAR(200),
            dwelling_limit VARCHAR(100),
            liability_limit VARCHAR(100),
            premium NUMERIC(12, 2),
            renewal_date DATE,
            remarks TEXT,
            outstanding_item TEXT,
            outstanding_item_due_date DATE,
            property_address_line_1 VARCHAR(200),
            property_address_line_2 VARCHAR(200),
            property_city VARCHAR(100),
            property_state VARCHAR(50),
            property_zip VARCHAR(20),
            is_primary_residence BOOLEAN DEFAULT 0,
            FOREIGN KEY (personal_insurance_id) REFERENCES personal_insurance(id)
        )
    """)
    print("Created homeowners_policies table")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == '__main__':
    migrate()
