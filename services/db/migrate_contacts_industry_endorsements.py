"""
Migration: Add client contacts table, industry field, and new GL endorsements.

Changes:
1. Creates client_contacts table with address fields
2. Adds industry column to clients table
3. Adds accidental_medical and liquor_liability endorsement columns to commercial_insurance
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'customer.db')


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Create client_contacts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS client_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            contact_person VARCHAR(200),
            email VARCHAR(200),
            phone_number VARCHAR(50),
            phone_extension VARCHAR(20),
            address_line_1 VARCHAR(200),
            address_line_2 VARCHAR(200),
            city VARCHAR(100),
            state VARCHAR(50),
            zip_code VARCHAR(20),
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id)
    """)

    # 2. Add industry column to clients
    try:
        cursor.execute("ALTER TABLE clients ADD COLUMN industry VARCHAR(200)")
    except sqlite3.OperationalError:
        pass  # Column already exists

    # 3. Add new GL endorsement columns to commercial_insurance
    for col in ['general_liability_endorsement_accidental_medical', 'general_liability_endorsement_liquor_liability']:
        try:
            cursor.execute(f"ALTER TABLE commercial_insurance ADD COLUMN {col} BOOLEAN DEFAULT 0")
        except sqlite3.OperationalError:
            pass  # Column already exists

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == '__main__':
    migrate()
